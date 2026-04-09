import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser, hasRoleOrCoordinatorType } from "@/lib/api/auth";
import { forbidden, serverError, success, unauthorized } from "@/lib/api/response";
import { db } from "@/lib/db";
import {
  fetchInboxMessagesSince,
  fetchRecentInboxMessages,
  fetchRecentSentMessages,
  fetchSentMessagesSince,
  getCurrentMailboxHistoryId,
  type SyncedInboxMessage,
} from "@/lib/mailing/gmailInbox";
import {
  applyThreadCompanyMapping,
  buildMailboxClassification,
  getThreadCompanyMapping,
} from "@/lib/mailing/threadMapping";

function getDomain(email: string) {
  const [, domain = ""] = email.toLowerCase().split("@");
  return domain.trim();
}

function getMailboxEmail() {
  const mailboxEmail = process.env.GOOGLE_GMAIL_USER?.trim();
  if (!mailboxEmail) {
    throw new Error("GOOGLE_GMAIL_USER is not configured");
  }
  return mailboxEmail;
}

function isCronAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return false;

  const authHeader = request.headers.get("authorization")?.trim();
  return authHeader === `Bearer ${cronSecret}`;
}

async function assertAuthorized(request: NextRequest) {
  if (isCronAuthorized(request)) {
    return true;
  }

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
    return forbidden("Insufficient permissions to sync mailbox mail");
  }

  return true;
}

async function resolveCompanyId(fromEmail: string) {
  const domain = getDomain(fromEmail);
  if (!domain) return null;

  const company =
    (await db.company.findFirst({
      where: {
        OR: [{ domain }, { domains: { some: { domain } } }],
      },
      select: {
        id: true,
      },
    })) ?? null;

  return company?.id ?? null;
}

async function resolveCompanyIdFromRecipients(
  recipients: string[],
) {
  const domains = Array.from(
    new Set(recipients.map(getDomain).filter(Boolean)),
  );

  if (domains.length === 0) return null;

  const company =
    (await db.company.findFirst({
      where: {
        OR: [
          { domain: { in: domains } },
          { domains: { some: { domain: { in: domains } } } },
        ],
      },
      select: {
        id: true,
      },
    })) ?? null;

  return company?.id ?? null;
}

async function findExistingOutboundEmail(message: SyncedInboxMessage) {
  const createdAtLowerBound = new Date(message.createdAt.getTime() - 15 * 60 * 1000);
  const createdAtUpperBound = new Date(message.createdAt.getTime() + 15 * 60 * 1000);

  return db.email.findFirst({
    where: {
      direction: "outbound",
      fromEmail: message.fromEmail,
      subject: message.subject,
      createdAt: {
        gte: createdAtLowerBound,
        lte: createdAtUpperBound,
      },
      OR: message.toEmails.map((email) => ({
        toEmails: {
          has: email,
        },
      })),
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
    },
  });
}

async function upsertMailboxMessage(message: SyncedInboxMessage) {
  const domainMatchedCompanyId =
    message.direction === "inbound"
      ? await resolveCompanyId(message.fromEmail)
      : await resolveCompanyIdFromRecipients([
          ...message.toEmails,
          ...message.ccEmails,
        ]);
  const existingThreadMapping = message.threadId?.trim()
    ? await getThreadCompanyMapping(message.threadId)
    : null;
  const finalCompanyId =
    existingThreadMapping?.companyId ?? domainMatchedCompanyId ?? null;
  const mappingSource = existingThreadMapping?.source
    ? existingThreadMapping.source
    : domainMatchedCompanyId
      ? "domain_match"
      : "unassigned";
  const confidence = existingThreadMapping?.confidence
    ? existingThreadMapping.confidence
    : domainMatchedCompanyId
      ? message.direction === "inbound"
        ? "high"
        : "medium"
      : null;
  const classification: Prisma.InputJsonObject = buildMailboxClassification(
    finalCompanyId,
    mappingSource,
    confidence,
    existingThreadMapping &&
      domainMatchedCompanyId &&
      existingThreadMapping.companyId !== domainMatchedCompanyId
      ? domainMatchedCompanyId
      : null,
  ) as Prisma.InputJsonObject;

  const existingByMessageId = await db.email.findUnique({
    where: {
      messageId: message.messageId,
    },
    select: {
      id: true,
    },
  });

  const existingEmail =
    existingByMessageId ??
    (message.direction === "outbound"
      ? await findExistingOutboundEmail(message)
      : null);

  const payload = {
    direction: message.direction,
    messageId: message.messageId,
    fromEmail: message.fromEmail,
    toEmails: message.toEmails,
    ccEmails: message.ccEmails,
    subject: message.subject,
    textBody: message.textBody,
    htmlBody: message.htmlBody,
    inReplyTo: message.inReplyTo,
    references: message.references,
    threadId: message.threadId,
    headers: message.headers,
    companyId: finalCompanyId,
    classification,
    providerStatus: message.providerStatus,
    providerEventAt: message.createdAt,
    createdAt: message.createdAt,
  } as const;

  if (existingEmail) {
    await db.email.update({
      where: {
        id: existingEmail.id,
      },
      data: {
        ...payload,
        attachments: {
          deleteMany: {},
          create: message.attachments.map((attachment) => ({
            fileName: attachment.fileName,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            storagePath: attachment.storagePath,
          })),
        },
      },
    });
  } else {
    await db.email.create({
      data: {
        ...payload,
        attachments: {
          create: message.attachments.map((attachment) => ({
            fileName: attachment.fileName,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            storagePath: attachment.storagePath,
          })),
        },
      },
    });
  }

  if (message.threadId?.trim() && domainMatchedCompanyId && !existingThreadMapping) {
    await applyThreadCompanyMapping({
      threadId: message.threadId,
      companyId: domainMatchedCompanyId,
      source: "domain_match",
      confidence: message.direction === "inbound" ? "high" : "medium",
    });
    return;
  }

  if (message.threadId?.trim() && existingThreadMapping?.companyId) {
    await applyThreadCompanyMapping({
      threadId: message.threadId,
      companyId: existingThreadMapping.companyId,
      source:
        existingThreadMapping.source === "manual_override"
          ? "manual_override"
          : existingThreadMapping.source === "mail_request"
            ? "mail_request"
            : "domain_match",
      confidence: existingThreadMapping.confidence,
      conflictingCompanyId:
        domainMatchedCompanyId &&
        domainMatchedCompanyId !== existingThreadMapping.companyId
          ? domainMatchedCompanyId
          : null,
    });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await assertAuthorized(request);
  if (authResult !== true) {
    return authResult;
  }

  try {
    const mailboxEmail = getMailboxEmail();
    const syncState = await db.mailboxSyncState.findUnique({
      where: {
        mailboxEmail,
      },
    });

    let nextHistoryId = syncState?.lastHistoryId ?? "";
    let messages: SyncedInboxMessage[] = [];

    if (syncState?.lastHistoryId) {
      try {
        const [inboxIncremental, sentIncremental] = await Promise.all([
          fetchInboxMessagesSince(syncState.lastHistoryId),
          fetchSentMessagesSince(syncState.lastHistoryId),
        ]);
        nextHistoryId = inboxIncremental.historyId || sentIncremental.historyId;
        messages = [...inboxIncremental.messages, ...sentIncremental.messages];
      } catch (error) {
        const messageText =
          error instanceof Error ? error.message : String(error ?? "");

        if (!messageText.includes("\"code\": 404")) {
          throw error;
        }

        const [recentInboxMessages, recentSentMessages] = await Promise.all([
          fetchRecentInboxMessages(15),
          fetchRecentSentMessages(15),
        ]);
        messages = [...recentInboxMessages, ...recentSentMessages];
        nextHistoryId = await getCurrentMailboxHistoryId();
      }
    } else {
      const [recentInboxMessages, recentSentMessages] = await Promise.all([
        fetchRecentInboxMessages(15),
        fetchRecentSentMessages(15),
      ]);
      messages = [...recentInboxMessages, ...recentSentMessages];
      nextHistoryId = await getCurrentMailboxHistoryId();
    }

    const dedupedMessages = Array.from(
      new Map(messages.map((message) => [message.messageId, message])).values(),
    );

    for (const message of dedupedMessages) {
      await upsertMailboxMessage(message);
    }

    await db.mailboxSyncState.upsert({
      where: {
        mailboxEmail,
      },
      update: {
        lastHistoryId: nextHistoryId || syncState?.lastHistoryId || null,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        mailboxEmail,
        lastHistoryId: nextHistoryId || null,
        lastSyncedAt: new Date(),
      },
    });

    return success({
      mailboxEmail,
      syncedCount: dedupedMessages.length,
      historyId: nextHistoryId || null,
      lastSyncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error syncing mailbox:", error);
    return serverError("Unable to sync mailbox");
  }
}
