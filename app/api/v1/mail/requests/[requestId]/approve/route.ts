import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser, hasRoleOrCoordinatorType } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from "@/lib/api/response";
import { validateBody } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { sendMail } from "@/lib/mailing/sendMail";
import { applyThreadCompanyMapping } from "@/lib/mailing/threadMapping";

const approveSchema = z.object({
  sendAt: z.string().datetime().optional(),
});

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
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
    return forbidden("Only mailing team or student representatives can approve requests");
  }

  const { requestId } = await params;
  const validation = await validateBody(request, approveSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const existingRequest = await db.mailRequest.findUnique({
      where: { id: requestId },
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

    if (!existingRequest) {
      return notFound("Mail request not found");
    }

    const requestedSendAt = validation.sendAt ? new Date(validation.sendAt) : null;
    const shouldSendNow = !requestedSendAt || requestedSendAt <= new Date();

    const previewPayload = asRecord(existingRequest.previewPayload);
    const recipientFilter = asRecord(existingRequest.recipientFilter);
    const recipientEmails = Array.from(
      new Set(asStringArray(recipientFilter?.emails)),
    );
    const ccEmails = Array.from(
      new Set(asStringArray(recipientFilter?.ccEmails)),
    );
    const replyContext = asRecord(recipientFilter?.replyContext);
    const inReplyTo = asOptionalString(replyContext?.messageId);
    const references = Array.from(
      new Set([
        ...asStringArray(replyContext?.references),
        ...(inReplyTo ? [inReplyTo] : []),
      ]),
    );

    if (shouldSendNow) {
      const subject =
        existingRequest.customSubject ??
        (typeof previewPayload?.subject === "string"
          ? previewPayload.subject
          : existingRequest.template?.subject) ??
        "";
      const htmlBody =
        existingRequest.customBody ??
        (typeof previewPayload?.htmlBody === "string"
          ? previewPayload.htmlBody
          : existingRequest.template?.bodyHtml) ??
        "";
      const textBody =
        typeof previewPayload?.textBody === "string"
          ? previewPayload.textBody
          : existingRequest.template?.bodyText ?? "";

      if (!subject.trim()) {
        return serverError("Mail subject is missing");
      }

      if (recipientEmails.length === 0) {
        return serverError("No recipient email addresses were found for this request");
      }

      const attachments =
        existingRequest.attachments.length > 0
          ? existingRequest.attachments.map(mapAttachmentRecord)
          : existingRequest.template?.attachments.map(mapAttachmentRecord) ?? [];

      const sendResult = await sendMail({
        to: recipientEmails,
        cc: ccEmails,
        subject,
        html: htmlBody,
        text: textBody,
        inReplyTo,
        references,
        attachments,
      });

      await db.email.create({
        data: {
          direction: "outbound",
          messageId: sendResult.messageId,
          threadId: sendResult.threadId,
          mailRequestId: existingRequest.id,
          templateId: existingRequest.templateId,
          templateVersion: existingRequest.templateVersion,
          companyId: existingRequest.companyId,
          companySeasonCycleId: existingRequest.companySeasonCycleId,
          fromEmail: sendResult.fromEmail,
          toEmails: recipientEmails,
          ccEmails,
          subject,
          textBody: textBody || null,
          htmlBody: htmlBody || null,
          inReplyTo,
          references,
        },
      });

      if (sendResult.threadId && existingRequest.companyId) {
        await applyThreadCompanyMapping({
          threadId: sendResult.threadId,
          companyId: existingRequest.companyId,
          source: "mail_request",
          confidence: "high",
        });
      }
    }

    const approvedRequest = await db.mailRequest.update({
      where: { id: requestId },
      data: {
        status: shouldSendNow ? "sent" : "queued",
        reviewedBy: user.id,
        sendAt: requestedSendAt,
        sentAt: shouldSendNow ? new Date() : null,
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
      action: "approve_mail_request",
      targetType: "mail_request",
      targetId: requestId,
      meta: {
        sendAt: validation.sendAt,
        status: shouldSendNow ? "sent" : "queued",
        repliedInThread: Boolean(inReplyTo),
      },
      ...clientInfo,
    });

    return success({
      ...approvedRequest,
      attachments: approvedRequest.attachments.map(mapAttachmentRecord),
      template: approvedRequest.template
        ? {
            ...approvedRequest.template,
            attachments: approvedRequest.template.attachments.map(
              mapAttachmentRecord,
            ),
          }
        : null,
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return notFound("Mail request not found");
    }

    console.error("Error approving mail request:", error);
    return serverError();
  }
}
