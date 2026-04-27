import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";
import { getCurrentUser } from "@/lib/api/auth";
import { db } from "@/lib/db";
import CompanyMailTrackerClient from "./CompanyMailTrackerClient";
import { ScrollToTop } from "./ScrollToTop";

function getThreadKey(email: { threadId: string | null; id: string }) {
  return email.threadId?.trim() || email.id;
}

function dedupeEmailsById<T extends { id: string }>(emails: T[]) {
  return Array.from(new Map(emails.map((email) => [email.id, email])).values());
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

  const directlyMappedEmails = await db.email.findMany({
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

  const mappedThreadIds = Array.from(
    new Set(
      directlyMappedEmails
        .map((email) => email.threadId?.trim() ?? "")
        .filter(Boolean),
    ),
  );

  const threadExpandedEmails =
    mappedThreadIds.length > 0
      ? await db.email.findMany({
          where: {
            threadId: {
              in: mappedThreadIds,
            },
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
          take: 300,
        })
      : [];

  const emails = dedupeEmailsById([
    ...directlyMappedEmails,
    ...threadExpandedEmails,
  ]).sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  );

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

  const threads = Array.from(threadMap.values())
    .map((thread) => ({
      ...thread,
      latestAt: thread.latestAt.toISOString(),
      messages: thread.messages
        .sort((left, right) => {
          return (
            new Date(left.createdAt).getTime() -
            new Date(right.createdAt).getTime()
          );
        })
        .map((message) => ({
          id: message.id,
          direction: message.direction,
          messageId: message.messageId,
          threadId: message.threadId,
          subject: message.subject,
          fromEmail: message.fromEmail,
          toEmails: message.toEmails,
          ccEmails: message.ccEmails,
          textBody: message.textBody,
          htmlBody: message.htmlBody,
          references: message.references,
          createdAt: message.createdAt.toISOString(),
          attachments: message.attachments.map((attachment) => ({
            id: attachment.id,
            fileName: attachment.fileName,
          })),
        })),
    }))
    .sort(
      (left, right) =>
        new Date(right.latestAt).getTime() - new Date(left.latestAt).getTime(),
    );

  const trackedDomains = Array.from(
    new Set(
      [company.domain, ...company.domains.map((item) => item.domain)]
        .map((value) => value?.trim().toLowerCase() ?? "")
        .filter(Boolean),
    ),
  );

  return (
    <>
      <ScrollToTop />
      <div className="-mt-6 xl:mt-0 space-y-5 px-4 pb-6 animate-fade-in xl:h-full xl:overflow-y-auto hide-scrollbar">
        <div className="mt-5 space-y-3">
          <div className="px-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <Link
                href={`/outreach?companyId=${company.id}`}
                aria-label="Back to task list"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
              >
                <ArrowLeft size={13} />
              </Link>
              <span className="text-slate-600">TASK LIST</span>
              <span>{"> "}</span>
              <span className="text-slate-700">{company.name}</span>
              <span>{"> "}</span>
              <span className="text-slate-700">Mail Tracker</span>
            </div>
          </div>

          <div className="w-full max-w-full min-w-0 overflow-hidden rounded-lg bg-white p-4">
            <div className="flex flex-col gap-4">
              <div className="min-w-0">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]">
                    <Mail size={18} />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg font-semibold text-slate-900">
                      {company.name} Mail Tracker
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                      Company-scoped mail threads expanded from direct company
                      matches so the full mailbox thread stays visible here.
                    </p>
                  </div>
                </div>
              </div>

              <CompanyMailTrackerClient
                companyId={company.id}
                trackedDomains={trackedDomains}
                threads={threads}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
