import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  CornerUpLeft,
  Mail,
  Paperclip,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import { getCurrentUser } from "@/lib/api/auth";
import { db } from "@/lib/db";

function formatDateTime(value: Date) {
  return value.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getThreadKey(email: { threadId: string | null; id: string }) {
  return email.threadId?.trim() || email.id;
}

function getReplyRecipient(email: {
  direction: "inbound" | "outbound";
  fromEmail: string;
  toEmails: string[];
}) {
  if (email.direction === "inbound") {
    return email.fromEmail.trim() || null;
  }

  return email.toEmails.find((value) => value.trim())?.trim() ?? null;
}

export default async function CompanyMailTrackerPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { companyId } = await params;

  const assignedCycle = await db.companySeasonCycle.findFirst({
    where: {
      companyId,
      ...(user.role === "tpo_admin" ? {} : { ownerUserId: user.id }),
    },
    select: {
      id: true,
    },
  });

  if (!assignedCycle) {
    notFound();
  }

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      domain: true,
      domains: {
        select: {
          domain: true,
        },
        orderBy: {
          domain: "asc",
        },
      },
    },
  });

  if (!company) {
    notFound();
  }

  const emails = await db.email.findMany({
    where: {
      companyId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      attachments: {
        select: {
          id: true,
          fileName: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    take: 100,
  });

  const threadMap = new Map<
    string,
    {
      key: string;
      subject: string;
      latestAt: Date;
      direction: "inbound" | "outbound";
      participants: string[];
      count: number;
      attachments: number;
      messages: typeof emails;
    }
  >();

  for (const email of emails) {
    const key = getThreadKey(email);
    const existing = threadMap.get(key);

    if (!existing) {
      threadMap.set(key, {
        key,
        subject: email.subject || "No subject",
        latestAt: email.createdAt,
        direction: email.direction,
        participants:
          email.direction === "inbound"
            ? [email.fromEmail]
            : email.toEmails.length > 0
              ? email.toEmails
              : [email.fromEmail],
        count: 1,
        attachments: email.attachments.length,
        messages: [email],
      });
      continue;
    }

    existing.count += 1;
    existing.attachments += email.attachments.length;
    existing.messages.push(email);

    if (email.createdAt > existing.latestAt) {
      existing.latestAt = email.createdAt;
      existing.subject = email.subject || existing.subject;
      existing.direction = email.direction;
      existing.participants =
        email.direction === "inbound"
          ? [email.fromEmail]
          : email.toEmails.length > 0
            ? email.toEmails
            : [email.fromEmail];
    }
  }

  const threads = Array.from(threadMap.values()).sort(
    (left, right) => right.latestAt.getTime() - left.latestAt.getTime(),
  );

  const trackedDomains = Array.from(
    new Set(
      [company.domain, ...company.domains.map((item) => item.domain)]
        .map((value) => value?.trim().toLowerCase() ?? "")
        .filter(Boolean),
    ),
  );

  return (
    <div className="space-y-5 py-4">
      <div className="rounded-2xl border border-[#DBEAFE] bg-white p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/outreach"
              className="btn btn-secondary btn-sm px-2"
              aria-label="Back to outreach"
            >
              <ArrowLeft size={14} />
            </Link>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Link href="/outreach" className="hover:text-[#2563EB]">
                Outreach
              </Link>
              <ChevronRight size={12} />
              <span className="truncate">{company.name}</span>
              <ChevronRight size={12} />
              <span className="text-slate-700">Mail Tracker</span>
            </div>
          </div>

          <div className="min-w-0">
            <div className="mt-3 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] text-[#2563EB]">
                <Mail size={18} />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-slate-900">
                  {company.name} Mail Tracker
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Company-scoped mail threads mapped from company assignment and
                  tracked sender domains.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Threads
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {threads.length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Messages
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {emails.length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Tracked Domains
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {trackedDomains.length > 0 ? (
                trackedDomains.map((domain) => (
                  <Badge key={domain} variant="gray" size="sm">
                    {domain}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-slate-500">No domains mapped</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#DBEAFE] bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Threads</h2>
            <p className="mt-1 text-xs text-slate-500">
              Inbound messages are matched to the company using its primary
              domain and additional company domains. Outbound mails are shown
              from company-linked records.
            </p>
          </div>
          <Badge variant="info" size="sm">
            {threads.length} thread{threads.length === 1 ? "" : "s"}
          </Badge>
        </div>

        {threads.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            No mails have been mapped to this company yet.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {threads.map((thread) => {
              const latestMessage = thread.messages.reduce((latest, email) =>
                email.createdAt > latest.createdAt ? email : latest,
              );
              const replyRecipient = getReplyRecipient(latestMessage);
              const canReply =
                Boolean(latestMessage.messageId?.trim()) &&
                Boolean(replyRecipient);
              const replyParams = canReply
                ? new URLSearchParams({
                    companyId: company.id,
                    replyThreadId: latestMessage.threadId?.trim() || thread.key,
                    replyMessageId: latestMessage.messageId,
                    replyRecipientEmail: replyRecipient ?? "",
                    replySubject: latestMessage.subject || "Re:",
                    replyReferences: latestMessage.references.join("||"),
                  }).toString()
                : null;

              return (
                <div
                  key={thread.key}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-slate-900">
                        {thread.subject}
                      </p>
                      <Badge
                        size="sm"
                        variant={
                          thread.direction === "inbound" ? "info" : "gray"
                        }
                      >
                        {thread.direction === "inbound" ? "Inbound" : "Outbound"}
                      </Badge>
                    </div>
                    <p className="mt-1 break-words text-sm text-slate-500">
                      {thread.direction === "inbound" ? "From" : "To"}{" "}
                      {thread.participants.join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-500">
                      Latest {formatDateTime(thread.latestAt)}
                    </p>
                    {replyParams ? (
                      <Link
                        href={`/outreach?${replyParams}`}
                        className="btn btn-primary btn-sm gap-1"
                      >
                        <CornerUpLeft size={13} />
                        Reply in thread
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
                    <Mail size={11} />
                    {thread.count} message{thread.count === 1 ? "" : "s"}
                  </span>
                  {thread.attachments > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
                      <Paperclip size={11} />
                      {thread.attachments} attachment
                      {thread.attachments === 1 ? "" : "s"}
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  {thread.messages
                    .sort(
                      (left, right) =>
                        right.createdAt.getTime() - left.createdAt.getTime(),
                    )
                    .map((email) => (
                      <div
                        key={email.id}
                        className="rounded-xl border border-white bg-white px-4 py-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            size="sm"
                            variant={
                              email.direction === "inbound" ? "info" : "gray"
                            }
                          >
                            {email.direction === "inbound"
                              ? "Inbound"
                              : "Outbound"}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {formatDateTime(email.createdAt)}
                          </span>
                        </div>
                        <div className="mt-2 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                          <p className="break-words">
                            <span className="font-semibold text-slate-900">
                              From:
                            </span>{" "}
                            {email.fromEmail}
                          </p>
                          <p className="break-words">
                            <span className="font-semibold text-slate-900">
                              To:
                            </span>{" "}
                            {email.toEmails.length > 0
                              ? email.toEmails.join(", ")
                              : "-"}
                          </p>
                        </div>
                        {(email.textBody || email.htmlBody) && (
                          <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">
                            {email.textBody?.trim() ||
                              email.htmlBody?.replace(/<[^>]+>/g, " ").trim() ||
                              "No message body available."}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
