import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser, hasRoleOrCoordinatorType } from "@/lib/api/auth";
import {
  badRequest,
  forbidden,
  notFound,
  serverError,
  success,
  unauthorized,
} from "@/lib/api/response";
import { validateBody } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { headers } from "next/headers";

const updateMailRequestSchema = z.object({
  subject: z.string().trim().min(1).max(500),
  htmlBody: z.string().trim().min(1),
  ccEmails: z.array(z.string().trim().email()).max(20).optional(),
});

const mailAttachmentSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().max(255).optional().nullable(),
  sizeBytes: z.number().int().nonnegative().optional().nullable(),
  storagePath: z.string().min(1).max(500),
  publicUrl: z.string().min(1).max(500),
});

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

function htmlToPlainText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
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
    return forbidden(
      "Only mailing team or student representatives can edit mail requests",
    );
  }

  const { requestId } = await params;
  const validation = await validateBody(request, updateMailRequestSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const existing = await prisma.mailRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        requestType: true,
        status: true,
        previewPayload: true,
        recipientFilter: true,
      },
    });

    if (!existing) {
      return notFound("Mail request not found");
    }

    if (existing.status !== "pending" && existing.status !== "queued") {
      return badRequest("Only pending or queued requests can be edited");
    }

    const plainText = htmlToPlainText(validation.htmlBody);
    const existingPreview =
      existing.previewPayload &&
      typeof existing.previewPayload === "object" &&
      !Array.isArray(existing.previewPayload)
        ? (existing.previewPayload as Prisma.JsonObject)
        : {};
    const existingRecipientFilter =
      existing.recipientFilter &&
      typeof existing.recipientFilter === "object" &&
      !Array.isArray(existing.recipientFilter)
        ? (existing.recipientFilter as Prisma.JsonObject)
        : {};

    const previewPayload: Prisma.InputJsonObject = {
      ...existingPreview,
      subject: validation.subject,
      htmlBody: validation.htmlBody,
      textBody: plainText,
    };
    const recipientFilter: Prisma.InputJsonObject = {
      ...existingRecipientFilter,
      ccEmails: validation.ccEmails ?? [],
    };

    const updated = await prisma.mailRequest.update({
      where: { id: requestId },
      data:
        existing.requestType === "custom"
          ? {
              customSubject: validation.subject,
              customBody: validation.htmlBody,
              previewPayload,
              recipientFilter,
              updatedAt: new Date(),
            }
          : {
              previewPayload,
              recipientFilter,
              updatedAt: new Date(),
            },
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

    await createAuditLog({
      actorId: user.id,
      action: "edit_mail_request",
      targetType: "mail_request",
      targetId: requestId,
      meta: {
        subject: validation.subject,
        ccEmails: validation.ccEmails ?? [],
        requestType: existing.requestType,
      },
      ...clientInfo,
    });

    return success({
      ...updated,
      attachments: updated.attachments.map(mapAttachmentRecord),
      template: updated.template
        ? {
            ...updated.template,
            attachments: updated.template.attachments.map(mapAttachmentRecord),
          }
        : null,
    });
  } catch (error) {
    console.error("Error updating mail request:", error);
    return serverError();
  }
}
