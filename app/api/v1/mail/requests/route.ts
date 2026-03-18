import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser, hasRoleOrCoordinatorType } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  badRequest,
  serverError,
} from "@/lib/api/response";
import { validateBody } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { headers } from "next/headers";

const mailAttachmentSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().max(255).optional().nullable(),
  sizeBytes: z.number().int().nonnegative().optional().nullable(),
  storagePath: z.string().min(1).max(500),
  publicUrl: z.string().min(1).max(500),
});

const createMailRequestSchema = z.object({
  companyId: z.string().uuid().optional(),
  companySeasonCycleId: z.string().uuid().optional(),
  requestType: z.enum(["template", "custom"]),
  templateId: z.string().uuid().optional(),
  templateVersion: z.number().int().optional(),
  customSubject: z.string().max(500).optional(),
  customBody: z.string().optional(),
  previewPayload: z.record(z.string(), z.any()).optional(),
  recipientFilter: z.record(z.string(), z.any()).optional(),
  urgency: z.number().int().min(1).max(5).optional(),
  attachments: z.array(mailAttachmentSchema).max(10).optional(),
});

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function mapAttachmentRecord(attachment: {
  mailAsset: {
    fileName: string;
    mimeType: string | null;
    sizeBytes: number | null;
    storagePath: string;
    publicUrl: string;
  };
}) {
  return {
    fileName: attachment.mailAsset.fileName,
    mimeType: attachment.mailAsset.mimeType,
    sizeBytes: attachment.mailAsset.sizeBytes,
    storagePath: attachment.mailAsset.storagePath,
    publicUrl: attachment.mailAsset.publicUrl,
  };
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const prisma = db as any;

  if (!user) {
    return unauthorized();
  }

  if (
    !hasRoleOrCoordinatorType(user, ["tpo_admin"], [
      "mailing_team",
      "student_representative",
    ])
  ) {
    return forbidden("Insufficient permissions to view mail requests");
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");

  try {
    const requests = await prisma.mailRequest.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            subject: true,
            bodyHtml: true,
            bodyText: true,
            status: true,
            variables: true,
            updatedAt: true,
            attachments: {
              include: {
                mailAsset: {
                  select: {
                    fileName: true,
                    mimeType: true,
                    sizeBytes: true,
                    storagePath: true,
                    publicUrl: true,
                  },
                },
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        },
        attachments: {
          include: {
            mailAsset: {
              select: {
                fileName: true,
                mimeType: true,
                sizeBytes: true,
                storagePath: true,
                publicUrl: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    const normalizedRequests = requests.map(
      (requestItem: {
        attachments: Array<{
          mailAsset: {
            fileName: string;
            mimeType: string | null;
            sizeBytes: number | null;
            storagePath: string;
            publicUrl: string;
          };
        }>;
        template?: {
          attachments: Array<{
            mailAsset: {
              fileName: string;
              mimeType: string | null;
              sizeBytes: number | null;
              storagePath: string;
              publicUrl: string;
            };
          }>;
        } | null;
      } & Record<string, unknown>) => {
      const requestAttachments = requestItem.attachments.map(mapAttachmentRecord);

      return {
        ...requestItem,
        attachments: requestAttachments,
        template: requestItem.template
          ? {
              ...requestItem.template,
              attachments: requestItem.template.attachments.map(
                mapAttachmentRecord,
              ),
            }
          : null,
      };
      },
    );

    return success(normalizedRequests);
  } catch (error) {
    console.error("Error fetching mail requests:", error);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  const prisma = db as any;

  if (!user) {
    return unauthorized();
  }

  if (
    !hasRoleOrCoordinatorType(user, ["tpo_admin"], [
      "mailing_team",
      "student_representative",
    ])
  ) {
    return forbidden("Insufficient permissions to create mail requests");
  }

  const validation = await validateBody(request, createMailRequestSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const { attachments, previewPayload, ...restValidation } = validation;

    const requestedStoragePaths =
      attachments?.map((item) => item.storagePath) ?? [];
    const uniqueRequestedStoragePaths = Array.from(
      new Set(requestedStoragePaths),
    );

    let resolvedAssets: Array<{ id: string }> = [];

    if (uniqueRequestedStoragePaths.length > 0) {
      resolvedAssets = await prisma.mailAsset.findMany({
        where: {
          storagePath: {
            in: uniqueRequestedStoragePaths,
          },
        },
        select: {
          id: true,
        },
      });

      if (resolvedAssets.length !== uniqueRequestedStoragePaths.length) {
        return badRequest(
          "Some attachments are missing. Please re-upload and try again.",
        );
      }
    }

    if (
      resolvedAssets.length === 0 &&
      restValidation.requestType === "template" &&
      restValidation.templateId
    ) {
      const templateAttachmentLinks = await prisma.emailTemplateAttachment.findMany({
        where: {
          templateId: restValidation.templateId,
        },
        select: {
          mailAssetId: true,
        },
      });

      resolvedAssets = templateAttachmentLinks.map(
        (link: { mailAssetId: string }) => ({
        id: link.mailAssetId,
        }),
      );
    }

    const normalizedPreviewPayload =
      (asRecord(previewPayload) ?? {}) as Prisma.InputJsonObject;

    const mailRequest = await prisma.mailRequest.create({
      data: {
        ...restValidation,
        previewPayload: normalizedPreviewPayload,
        requestedBy: user.id,
        status: "pending",
        attachments:
          resolvedAssets.length > 0
            ? {
                create: resolvedAssets.map((asset) => ({
                  mailAssetId: asset.id,
                })),
              }
            : undefined,
      },
      include: {
        attachments: {
          include: {
            mailAsset: {
              select: {
                fileName: true,
                mimeType: true,
                sizeBytes: true,
                storagePath: true,
                publicUrl: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "create_mail_request",
      targetType: "mail_request",
      targetId: mailRequest.id,
      meta: {
        requestType: restValidation.requestType,
        attachmentCount: resolvedAssets.length,
      },
      ...clientInfo,
    });

    return success({
      ...mailRequest,
      attachments: mailRequest.attachments.map(mapAttachmentRecord),
    });
  } catch (error) {
    console.error("Error creating mail request:", error);
    return serverError();
  }
}
