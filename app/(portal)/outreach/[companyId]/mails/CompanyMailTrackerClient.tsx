"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Mail, Paperclip, Send } from "lucide-react";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";

type TrackerMessage = {
  id: string;
  direction: "inbound" | "outbound";
  messageId: string | null;
  threadId: string | null;
  subject: string | null;
  fromEmail: string;
  toEmails: string[];
  ccEmails: string[];
  textBody: string | null;
  htmlBody: string | null;
  references: string[];
  createdAt: string;
  attachments: Array<{
    id: string;
    fileName: string;
  }>;
};

type TrackerThread = {
  key: string;
  subject: string;
  latestAt: string;
  direction: "inbound" | "outbound";
  participants: string[];
  count: number;
  attachments: number;
  messages: TrackerMessage[];
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getReplyRecipient(message: TrackerMessage) {
  if (message.direction === "inbound") {
    return message.fromEmail.trim() || null;
  }

  return message.toEmails.find((value) => value.trim())?.trim() ?? null;
}

function canReplyToMessage(message: TrackerMessage) {
  return Boolean(message.messageId?.trim()) && Boolean(getReplyRecipient(message));
}

function buildReplyHref(companyId: string, threadKey: string, message: TrackerMessage) {
  const replyRecipient = getReplyRecipient(message);
  if (!message.messageId?.trim() || !replyRecipient) {
    return null;
  }

  return `/outreach?${new URLSearchParams({
    companyId,
    replyThreadId: message.threadId?.trim() || threadKey,
    replyMessageId: message.messageId,
    replyRecipientEmail: replyRecipient,
    replySubject: message.subject || "Re:",
    replyReferences: message.references.join("||"),
  }).toString()}`;
}

function buildInboundHtmlDocument(html: string) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root { color-scheme: light; }
      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #0f172a;
        font-family: Arial, sans-serif;
      }
      body {
        padding: 16px;
        overflow-wrap: anywhere;
      }
      img, table {
        max-width: 100%;
      }
      a {
        color: #2563eb;
      }
    </style>
  </head>
  <body>${html}</body>
</html>`;
}

export default function CompanyMailTrackerClient({
  companyId,
  trackedDomains,
  threads,
}: {
  companyId: string;
  trackedDomains: string[];
  threads: TrackerThread[];
}) {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.key === selectedThreadId) ?? null,
    [selectedThreadId, threads],
  );

  return (
    <>
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
            {threads.reduce((total, thread) => total + thread.messages.length, 0)}
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

      <div className="mt-5 rounded-2xl border border-[#DBEAFE] bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Threads</h2>
            <p className="mt-1 text-xs text-slate-500">
              Once one mail in a Gmail thread is linked to this company, the tracker
              shows the rest of that thread too.
            </p>
          </div>
          <Badge variant="info" size="sm">
            {threads.length} thread{threads.length === 1 ? "" : "s"}
          </Badge>
        </div>

        {threads.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={Mail}
              title="No mails mapped yet"
              description="Mailbox threads linked to this company will appear here."
            />
          </div>
        ) : selectedThread ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm mb-3 px-2"
                  onClick={() => setSelectedThreadId(null)}
                  aria-label="Back to threads"
                >
                  <ArrowLeft size={14} />
                </button>
                <h3 className="truncate text-lg font-semibold text-slate-900">
                  {selectedThread.subject || "No subject"}
                </h3>
                <p className="text-sm text-slate-500">
                  {selectedThread.messages.length} mail
                  {selectedThread.messages.length > 1 ? "s" : ""} in this thread
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {selectedThread.messages.map((message) => {
                const replyHref = buildReplyHref(companyId, selectedThread.key, message);
                return (
                  <div
                    key={message.id}
                    className="rounded-2xl border border-[#DBEAFE] bg-white p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-semibold text-slate-900">
                          {message.subject || "No subject"}
                        </h4>
                        <Badge
                          variant={message.direction === "inbound" ? "info" : "gray"}
                          size="sm"
                        >
                          {message.direction === "inbound" ? "Inbound" : "Outbound"}
                        </Badge>
                      </div>
                      {replyHref ? (
                        <Link href={replyHref} className="btn btn-secondary btn-sm gap-1">
                          <Send size={12} />
                          Reply
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm gap-1"
                          disabled={!canReplyToMessage(message)}
                        >
                          <Send size={12} />
                          Reply
                        </button>
                      )}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          To
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {message.toEmails.length > 0 ? message.toEmails.join(", ") : "-"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          From
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {message.fromEmail || "-"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {message.direction === "inbound" ? "Received" : "Sent"}
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {formatDateTime(message.createdAt)}
                        </p>
                      </div>
                    </div>

                    {message.ccEmails.length > 0 ? (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        <p>
                          <strong>CC:</strong> {message.ccEmails.join(", ")}
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
                        Message body
                      </div>
                      {message.htmlBody ? (
                        <iframe
                          title={`Outreach email ${message.id}`}
                          srcDoc={buildInboundHtmlDocument(message.htmlBody)}
                          sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                          className="h-60 w-full bg-white"
                        />
                      ) : (
                        <div className="whitespace-pre-wrap p-4 text-sm leading-relaxed text-slate-700">
                          {message.textBody || "No body content available."}
                        </div>
                      )}
                    </div>

                    {message.attachments.length > 0 ? (
                      <div className="mt-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Attachments
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {message.attachments.map((attachment) => (
                            <span
                              key={attachment.id}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                            >
                              <Paperclip size={12} />
                              {attachment.fileName}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {threads.map((thread) => (
              <button
                key={thread.key}
                type="button"
                className="w-full rounded-2xl border border-[#DBEAFE] bg-[#F8FBFF] p-4 text-left transition hover:border-[#93C5FD] hover:bg-white"
                onClick={() => setSelectedThreadId(thread.key)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {thread.subject}
                      </p>
                      <Badge
                        variant={thread.direction === "inbound" ? "info" : "gray"}
                        size="sm"
                      >
                        {thread.direction === "inbound" ? "Inbound" : "Outbound"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {thread.direction === "inbound" ? "From" : "To"}{" "}
                      {thread.participants.join(", ")}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>{formatDateTime(thread.latestAt)}</p>
                    <div className="mt-2 flex flex-wrap justify-end gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
                        <Mail size={11} />
                        {thread.count} message{thread.count === 1 ? "" : "s"}
                      </span>
                      {thread.attachments > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
                          <Paperclip size={11} />
                          {thread.attachments} attachment
                          {thread.attachments === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
