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

const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  subject: z.string().min(1).max(500),
  bodyHtml: z.string().min(1),
  bodyText: z.string().optional(),
  variables: z.array(z.string()).optional(),
  sendPolicy: z.record(z.string(), z.any()).optional(),
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

  if (!user) {
    return unauthorized();
  }

  if (
    !hasRoleOrCoordinatorType(user, ["tpo_admin"], [
      "mailing_team",
      "student_representative",
    ])
  ) {
    return forbidden("Insufficient permissions to view templates");
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");

  try {
    const templates = await db.emailTemplate.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
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
        _count: {
          select: {
            versions: true,
            mailRequests: true,
            emails: true,
          },
        },
      },
    });

    const normalizedTemplates = templates.map((template) => ({
      ...template,
      attachments: template.attachments.map(mapAttachmentRecord),
    }));

    return success(normalizedTemplates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (
    !hasRoleOrCoordinatorType(user, ["tpo_admin"], [
      "mailing_team",
      "student_representative",
    ])
  ) {
    return forbidden("Insufficient permissions to create templates");
  }

  const validation = await validateBody(request, createTemplateSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const { attachments, sendPolicy, ...restValidation } = validation;

    const attachmentStoragePaths = attachments?.map((item) => item.storagePath) ?? [];
    const uniqueStoragePaths = Array.from(new Set(attachmentStoragePaths));

    let resolvedAssets: Array<{ id: string; storagePath: string }> = [];

    if (uniqueStoragePaths.length > 0) {
      resolvedAssets = await db.mailAsset.findMany({
        where: {
          storagePath: {
            in: uniqueStoragePaths,
          },
        },
        select: {
          id: true,
          storagePath: true,
        },
      });

      if (resolvedAssets.length !== uniqueStoragePaths.length) {
        return badRequest("Some attachments are missing. Please re-upload and try again.");
      }
    }

    const normalizedSendPolicy: Prisma.InputJsonObject =
      (asRecord(sendPolicy) ?? {}) as Prisma.InputJsonObject;

    const template = await db.emailTemplate.create({
      data: {
        ...restValidation,
        sendPolicy: normalizedSendPolicy,
        status: "approved",
        createdBy: user.id,
        approvedBy: user.id,
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
      action: "create_email_template",
      targetType: "email_template",
      targetId: template.id,
      meta: { name: template.name, attachmentCount: attachments?.length ?? 0 },
      ...clientInfo,
    });

    return success({
      ...template,
      attachments: template.attachments.map(mapAttachmentRecord),
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return serverError("Template with this slug already exists");
    }

    console.error("Error creating template:", error);
    return serverError();
  }
}
