import { NextRequest } from "next/server";
import { getCurrentUser, hasRoleOrCoordinatorType } from "@/lib/api/auth";
import { forbidden, serverError, success, unauthorized } from "@/lib/api/response";
import { db } from "@/lib/db";

type InboxBucket = "all" | "unassigned" | "misc" | "company";

function mapAttachment(attachment: {
  id: string;
  fileName: string;
  sizeBytes: number | null;
}) {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    sizeBytes: attachment.sizeBytes,
  };
}

function getBucketFilter(bucket: InboxBucket) {
  if (bucket === "company") {
    return {
      companyId: {
        not: null,
      },
    };
  }

  if (bucket === "misc") {
    return {
      classification: {
        path: ["bucket"],
        equals: "misc",
      },
    };
  }

  if (bucket === "unassigned") {
    return {
      companyId: null,
    };
  }

  return undefined;
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
    return forbidden("Insufficient permissions to view mailbox mail");
  }

  const bucket = (request.nextUrl.searchParams.get("bucket") ??
    "all") as InboxBucket;
  const pageParam = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "25");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(limitParam, 100)
      : 25;

  try {
    const syncState = await db.mailboxSyncState.findUnique({
      where: {
        mailboxEmail: process.env.GOOGLE_GMAIL_USER ?? "",
      },
      select: {
        lastSyncedAt: true,
      },
    });

    const where = {
      ...getBucketFilter(bucket),
    };

    const [total, mailboxItems] = await Promise.all([
      db.email.count({ where }),
      db.email.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          attachments: {
            select: {
              id: true,
              fileName: true,
              sizeBytes: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      }),
    ]);

    const normalized = mailboxItems.map((email) => ({
      id: email.id,
      direction: email.direction,
      messageId: email.messageId,
      subject: email.subject,
      fromEmail: email.fromEmail,
      toEmails: email.toEmails,
      ccEmails: email.ccEmails,
      textBody: email.textBody,
      htmlBody: email.htmlBody,
      createdAt: email.createdAt.toISOString(),
      references: email.references,
      threadId: email.threadId,
      classification: email.classification,
      company: email.company,
      attachments: email.attachments.map(mapAttachment),
    }));

    return success(normalized, {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      lastSyncedAt: syncState?.lastSyncedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("Error fetching mailbox:", error);
    return serverError("Unable to load mailbox");
  }
}
