"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Inbox,
  LayoutTemplate,
  Mail,
  Pencil,
  Paperclip,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  User2,
  XCircle,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import FilterSelect from "@/components/ui/FilterSelect";
import MailAttachmentInput, {
  type MailAttachmentMeta,
} from "@/components/ui/MailAttachmentInput";
import Modal from "@/components/ui/Modal";
import RichTextEditor, {
  type RichTextEditorHandle,
} from "@/components/ui/RichTextEditor";
import SearchBar from "@/components/ui/SearchBar";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  PREDEFINED_TEMPLATE_VARIABLES,
  appendTemplateVariables,
} from "@/lib/mailing/templateVariables";

type ViewMode = "queue" | "templates" | "mailbox";
type MailStatus = "pending" | "queued" | "sent" | "rejected" | "cancelled";
type MailType = "template" | "custom";
type TemplateStatus = "draft" | "approved" | "archived";
type MailboxBucket = "all";

type ApiResponse<T> = {
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: unknown;
  };
  error?: { message?: string };
};

type MailRequestRecord = {
  id: string;
  companyId?: string | null;
  requestType: MailType;
  senderEmail?: string | null;
  customSubject?: string | null;
  customBody?: string | null;
  previewPayload?: {
    subject?: string;
    htmlBody?: string;
    textBody?: string;
    attachments?: MailAttachmentMeta[];
  } | null;
  recipientFilter?: {
    emails?: string[];
    ccEmails?: string[];
    replyContext?: {
      threadId?: string;
      messageId?: string;
      references?: string[];
    };
  } | null;
  attachments?: MailAttachmentMeta[];
  status: MailStatus;
  urgency?: number | null;
  reviewNote?: string | null;
  sendAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
  requester: {
    id: string;
    name: string;
    email: string;
  };
  reviewer?: {
    id: string;
    name: string;
    email: string;
  } | null;
  company?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  template?: {
    id: string;
    name: string;
    subject: string;
    bodyHtml?: string | null;
    bodyText?: string | null;
    status: TemplateStatus;
    variables: string[];
    updatedAt: string;
    attachments?: MailAttachmentMeta[];
  } | null;
};

type TemplateRecord = {
  id: string;
  name: string;
  slug: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string | null;
  variables: string[];
  attachments?: MailAttachmentMeta[];
  status: TemplateStatus;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  } | null;
  approver?: {
    id: string;
    name: string;
    email: string;
  } | null;
  _count?: {
    versions: number;
    mailRequests: number;
    emails: number;
  };
};

type TemplateFormState = {
  name: string;
  slug: string;
  subject: string;
  contentHtml: string;
  plainTextFallback: string;
  variables: string;
  attachments: MailAttachmentMeta[];
};

type TemplateFormFieldValue = TemplateFormState[keyof TemplateFormState];

type MailboxEmailRecord = {
  id: string;
  direction: "inbound" | "outbound";
  messageId?: string;
  subject?: string | null;
  fromEmail?: string | null;
  toEmails?: string[];
  ccEmails?: string[];
  textBody?: string | null;
  htmlBody?: string | null;
  createdAt?: string;
  references?: string[];
  threadId?: string | null;
  classification?: Record<string, unknown> | null;
  company?: {
    id: string;
    name: string;
  } | null;
  attachments?: Array<{
    id: string;
    fileName: string;
    sizeBytes?: number | null;
  }>;
};

type MailboxMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type ThreadCompanyOption = {
  id: string;
  name: string;
  domain?: string | null;
};

const VIEW_OPTIONS: Array<{
  value: ViewMode;
  label: string;
  icon: React.ElementType;
  hint: string;
}> = [
  {
    value: "queue",
    label: "Queue",
    icon: Mail,
    hint: "Approve coordinator requests and dispatch mail.",
  },
  {
    value: "mailbox",
    label: "Mailbox",
    icon: Inbox,
    hint: "Monitor inbound and outbound threads from the shared mailbox.",
  },
  {
    value: "templates",
    label: "Templates",
    icon: LayoutTemplate,
    hint: "Manage reusable mail templates and approvals.",
  },
];

const QUEUE_TYPE_OPTIONS = [
  { value: "template", label: "Template" },
  { value: "custom", label: "Custom" },
];

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { credentials: "include", ...init });
  const text = await response.text();
  let body: ApiResponse<T> = {};

  if (text) {
    try {
      body = JSON.parse(text) as ApiResponse<T>;
    } catch {
      body = {};
    }
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error(body.error?.message ?? "Request failed");
  }

  return body;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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

function getMailCompanyName(mail: MailRequestRecord) {
  return mail.company?.name ?? "Unmapped company";
}

function getMailSubject(mail: MailRequestRecord) {
  return (
    mail.customSubject ??
    mail.previewPayload?.subject ??
    mail.template?.subject ??
    "Untitled mail request"
  );
}

function getMailPreview(mail: MailRequestRecord) {
  return (
    mail.customBody ??
    mail.previewPayload?.textBody ??
    mail.template?.bodyText ??
    "Preview will be generated from the selected template at send time."
  );
}

function getMailHtml(mail: MailRequestRecord) {
  return (
    mail.customBody ?? mail.previewPayload?.htmlBody ?? mail.template?.bodyHtml
  );
}

function getMailAttachments(mail: MailRequestRecord) {
  if (mail.attachments && mail.attachments.length > 0) {
    return mail.attachments;
  }

  if (
    mail.previewPayload?.attachments &&
    mail.previewPayload.attachments.length > 0
  ) {
    return mail.previewPayload.attachments;
  }

  return mail.template?.attachments ?? [];
}

function getMailToRecipients(mail: MailRequestRecord) {
  const emails = mail.recipientFilter?.emails;
  if (!emails || emails.length === 0) {
    return "No recipients selected";
  }

  return emails.join(", ");
}

function getMailCcRecipients(mail: MailRequestRecord) {
  const emails = mail.recipientFilter?.ccEmails;
  if (!emails || emails.length === 0) {
    return "-";
  }

  return emails.join(", ");
}

function getMailFromAddress(mail: MailRequestRecord) {
  return mail.senderEmail?.trim() || mail.requester.email || "-";
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getMailboxThreadKey(email: MailboxEmailRecord) {
  return email.threadId?.trim() || email.id;
}

function parseRecipientInput(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,;]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function buildReplySubject(value?: string | null) {
  const normalized = value?.trim() ?? "";
  if (!normalized) return "Re:";
  return /^re:/i.test(normalized) ? normalized : `Re: ${normalized}`;
}

function canReplyToMailboxEmail(email: MailboxEmailRecord) {
  if (email.direction === "inbound") {
    return Boolean(email.fromEmail?.trim());
  }

  return Boolean(email.toEmails?.some((recipient) => recipient.trim()));
}

function DropdownCaretIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 10 6"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M5 6 0 0h10L5 6Z" />
    </svg>
  );
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
        overflow: hidden;
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

function resizeInboundFrame(frame: HTMLIFrameElement | null) {
  if (!frame) return;

  const doc = frame.contentDocument;
  if (!doc) return;

  const bodyHeight = doc.body?.scrollHeight ?? 0;
  const htmlHeight = doc.documentElement?.scrollHeight ?? 0;
  const nextHeight = Math.max(bodyHeight, htmlHeight, 240);
  frame.style.height = `${nextHeight}px`;
}

function resizeInboundFramePreservingScroll(frame: HTMLIFrameElement | null) {
  if (!frame || typeof window === "undefined") {
    resizeInboundFrame(frame);
    return;
  }

  const scrollTop = window.scrollY;
  resizeInboundFrame(frame);

  window.requestAnimationFrame(() => {
    window.scrollTo({ top: scrollTop });
  });
}

function buildTemplateFormState(
  template?: TemplateRecord | null,
): TemplateFormState {
  return {
    name: template?.name ?? "",
    slug: template?.slug ?? "",
    subject: template?.subject ?? "",
    contentHtml: template?.bodyHtml ?? "<p></p>",
    plainTextFallback: template?.bodyText ?? "",
    variables: template?.variables.join(", ") ?? "",
    attachments: template?.attachments ?? [],
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function plainTextToHtml(value: string) {
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return "<p></p>";

  return normalized
    .split(/\n{2,}/)
    .map(
      (paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`,
    )
    .join("");
}

function looksLikeHtml(value: string) {
  return /<\/?[a-z][^>]*>/i.test(value);
}

function normalizeMailEditorHtml(
  htmlValue?: string | null,
  fallbackText?: string,
) {
  if (htmlValue && htmlValue.trim()) {
    return looksLikeHtml(htmlValue) ? htmlValue : plainTextToHtml(htmlValue);
  }

  return plainTextToHtml(fallbackText ?? "");
}

function StatCard({
  icon: Icon,
  label,
  value,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  active?: boolean;
  onClick?: () => void;
}) {
  const className = `rounded-2xl border px-4 py-4 text-left transition-all ${
    active
      ? "border-[#2563EB] bg-[#EFF6FF] shadow-sm"
      : "border-[#DBEAFE] bg-white hover:border-[#BFDBFE] hover:bg-[#F8FBFF]"
  }`;

  const content = (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          active ? "bg-[#2563EB]" : "bg-[#EFF6FF]"
        }`}
      >
        <Icon size={18} className={active ? "text-white" : "text-[#2563EB]"} />
      </div>
      <div className="min-w-0">
        <p
          className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
            active ? "text-[#1D4ED8]" : "text-slate-500"
          }`}
        >
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );

  if (!onClick) return <div className={className}>{content}</div>;
  return (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  );
}

function SectionSkeleton({
  cards = 3,
  detail = true,
}: {
  cards?: number;
  detail?: boolean;
}) {
  return (
    <div
      className={`grid gap-4 ${
        detail
          ? "xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.9fr)]"
          : "grid-cols-1"
      }`}
    >
      <div className="space-y-3">
        {Array.from({ length: cards }).map((_, index) => (
          <div
            key={index}
            className="w-full rounded-2xl border border-[#DBEAFE] bg-white p-4"
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="flex min-w-0 flex-1 gap-3">
                <div className="mt-1 shrink-0">
                  <div className="shimmer h-4 w-4 rounded" />
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <div className="shimmer h-5 w-40 rounded-full" />
                        <div className="shimmer h-5 w-20 rounded-full" />
                        <div className="shimmer h-5 w-16 rounded-full" />
                      </div>
                      <div className="shimmer h-4 w-full rounded-full" />
                      <div className="shimmer h-4 w-10/12 rounded-full" />
                    </div>
                    <div className="shimmer h-6 w-24 rounded-full" />
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="shimmer h-4 w-24 rounded-full" />
                    <div className="shimmer h-4 w-36 rounded-full" />
                    <div className="shimmer h-4 w-28 rounded-full" />
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 xl:w-auto xl:justify-end">
                    <div className="shimmer h-8 w-16 rounded-lg" />
                    <div className="shimmer h-8 w-20 rounded-lg" />
                    <div className="shimmer h-8 w-16 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {detail && (
        <div className="rounded-2xl border border-[#DBEAFE] bg-white p-5">
          <div className="space-y-3">
            <div className="shimmer h-5 w-40 rounded-full" />
            <div className="shimmer h-4 w-full rounded-full" />
            <div className="shimmer h-4 w-5/6 rounded-full" />
            <div className="shimmer h-32 w-full rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewModal({
  mail,
  submitting,
  decisionSubmitting,
  onSave,
  onApprove,
  onReject,
  onClose,
}: {
  mail: MailRequestRecord | null;
  submitting: boolean;
  decisionSubmitting: boolean;
  onSave: (
    mail: MailRequestRecord,
    payload: { subject: string; htmlBody: string; ccEmails: string[] },
  ) => Promise<void>;
  onApprove: (mail: MailRequestRecord) => void;
  onReject: (mail: MailRequestRecord, note: string) => void;
  onClose: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [subject, setSubject] = useState(() =>
    mail ? getMailSubject(mail) : "",
  );
  const [contentHtml, setContentHtml] = useState(() =>
    mail
      ? normalizeMailEditorHtml(getMailHtml(mail), getMailPreview(mail))
      : "<p></p>",
  );
  const [ccRecipients, setCcRecipients] = useState(
    () => mail?.recipientFilter?.ccEmails?.join(", ") ?? "",
  );
  const [reviewNote, setReviewNote] = useState(() => mail?.reviewNote ?? "");
  const [errorMessage, setErrorMessage] = useState("");

  if (!mail) return null;

  const currentMail: MailRequestRecord = mail;

  const html = getMailHtml(currentMail);
  const preview = getMailPreview(currentMail);
  const attachments = getMailAttachments(currentMail);
  const canEdit =
    currentMail.status === "pending" || currentMail.status === "queued";
  const contentTextPreview = htmlToPlainText(contentHtml);

  async function handleSave() {
    if (!subject.trim() || !contentTextPreview.trim()) return;

    setErrorMessage("");
    try {
      await onSave(currentMail, {
        subject: subject.trim(),
        htmlBody: contentHtml,
        ccEmails: parseRecipientInput(ccRecipients),
      });
      setIsEditing(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save email content",
      );
    }
  }

  return (
    <Modal
      isOpen={!!mail}
      onClose={onClose}
      title={`Preview - ${getMailCompanyName(currentMail)}`}
      size="lg"
      footer={
        <>
          {canEdit && !isEditing && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setIsEditing(true);
                setErrorMessage("");
              }}
            >
              <Pencil size={14} />
              Edit
            </button>
          )}
          {canEdit && isEditing && (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setIsEditing(false);
                  setErrorMessage("");
                  setSubject(getMailSubject(currentMail));
                  const initialHtml = getMailHtml(currentMail);
                  setContentHtml(
                    normalizeMailEditorHtml(
                      initialHtml,
                      getMailPreview(currentMail),
                    ),
                  );
                  setCcRecipients(
                    currentMail.recipientFilter?.ccEmails?.join(", ") ?? "",
                  );
                }}
                disabled={submitting}
              >
                Cancel edit
              </button>
              <button
                className="btn btn-primary"
                onClick={() => void handleSave()}
                disabled={
                  submitting || !subject.trim() || !contentTextPreview.trim()
                }
              >
                {submitting ? "Saving..." : "Save"}
              </button>
            </>
          )}
          {currentMail.status === "pending" && !isEditing && (
            <>
              <button
                className="btn btn-danger"
                onClick={() => onReject(currentMail, reviewNote)}
                disabled={decisionSubmitting || !reviewNote.trim()}
              >
                <XCircle size={14} />
                {decisionSubmitting ? "Working..." : "Reject"}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => onApprove(currentMail)}
                disabled={decisionSubmitting}
              >
                <CheckCircle2 size={14} />
                {decisionSubmitting ? "Working..." : "Send Now"}
              </button>
            </>
          )}
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              To
            </p>
            <p className="mt-1 text-sm text-slate-900 break-words">
              {getMailToRecipients(currentMail)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              From
            </p>
            <p className="mt-1 text-sm text-slate-900 break-words">
              {getMailFromAddress(currentMail)}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            CC
          </p>
          {isEditing ? (
            <input
              className="input-base mt-2"
              value={ccRecipients}
              onChange={(event) => setCcRecipients(event.target.value)}
              placeholder="hr@example.com, team@example.com"
            />
          ) : (
            <p className="mt-1 text-sm text-slate-900 break-words">
              {getMailCcRecipients(currentMail)}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Subject
          </p>
          {isEditing ? (
            <input
              className="input-base mt-2"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Email subject"
            />
          ) : (
            <p className="mt-1 text-sm font-semibold text-slate-900 break-words">
              {subject}
            </p>
          )}
        </div>

        {isEditing ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email Content
            </label>
            <RichTextEditor
              value={contentHtml}
              onChange={setContentHtml}
              enterKeyMode="lineBreak"
              placeholder="Edit email content"
            />
            <p className="mt-1 text-xs text-slate-500">
              This uses the same editor as template creation.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2">
              <div className="h-3 w-3 rounded-full bg-blue-400" />
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <div className="h-3 w-3 rounded-full bg-emerald-400" />
              <span className="ml-2 text-xs text-slate-400">Email Preview</span>
            </div>
            {html ? (
              <div
                className="prose prose-sm max-w-none p-4"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <div className="p-4 text-sm leading-relaxed text-slate-600">
                {preview}
              </div>
            )}
          </div>
        )}

        {attachments.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Attachments ({attachments.length})
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {attachments.map((attachment) => (
                <Badge key={attachment.storagePath} variant="gray" size="sm">
                  {attachment.fileName}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {currentMail.status === "pending" && !isEditing && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Review Note
            </label>
            <textarea
              rows={4}
              className="input-base mt-2"
              placeholder="Explain why this request is being rejected..."
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">
              Required for rejection. Optional for approval.
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}
      </div>
    </Modal>
  );
}

function MailboxReplyModal({
  open,
  email,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  email: MailboxEmailRecord | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    email?: MailboxEmailRecord | null;
    toEmails: string[];
    ccEmails: string[];
    subject: string;
    htmlBody: string;
    attachments: MailAttachmentMeta[];
    sendNow: boolean;
  }) => Promise<void>;
}) {
  const [toRecipients, setToRecipients] = useState(() =>
    email
      ? email.direction === "inbound"
        ? (email.fromEmail?.trim() ?? "")
        : (email.toEmails ?? []).join(", ")
      : "",
  );
  const [ccRecipients, setCcRecipients] = useState(() =>
    email ? (email.ccEmails ?? []).join(", ") : "",
  );
  const [subject, setSubject] = useState(() =>
    email ? buildReplySubject(email.subject) : "",
  );
  const [contentHtml, setContentHtml] = useState("<p></p>");
  const [attachments, setAttachments] = useState<MailAttachmentMeta[]>([]);

  const toEmails = parseRecipientInput(toRecipients);
  const ccEmails = parseRecipientInput(ccRecipients);
  const plainText = htmlToPlainText(contentHtml);
  const canSubmit = toEmails.length > 0 && subject.trim() && plainText.trim();
  const isReply = Boolean(email);

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={
        isReply
          ? `Reply${email?.company?.name ? ` - ${email.company.name}` : ""}`
          : "Compose Mail"
      }
      size="lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={submitting || !canSubmit}
            onClick={() =>
              void onSubmit({
                email,
                toEmails,
                ccEmails,
                subject: subject.trim(),
                htmlBody: contentHtml,
                attachments,
                sendNow: true,
              })
            }
          >
            <Send size={14} />
            {submitting ? "Working..." : isReply ? "Send Now" : "Send Mail"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {isReply ? (
          <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm text-[#1D4ED8]">
            This reply will stay in the same mailbox thread.
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              To *
            </label>
            <input
              className="input-base"
              value={toRecipients}
              onChange={(event) => setToRecipients(event.target.value)}
              placeholder="hr@example.com, team@example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              CC
            </label>
            <input
              className="input-base"
              value={ccRecipients}
              onChange={(event) => setCcRecipients(event.target.value)}
              placeholder="optional@example.com"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Subject *
          </label>
          <input
            className="input-base"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Email subject"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {isReply ? "Reply Content *" : "Mail Content *"}
          </label>
          <RichTextEditor
            value={contentHtml}
            onChange={setContentHtml}
            enterKeyMode="lineBreak"
            placeholder={isReply ? "Write the reply" : "Write the email"}
          />
        </div>
        <MailAttachmentInput
          value={attachments}
          onChange={setAttachments}
          disabled={submitting}
          maxFiles={6}
        />
      </div>
    </Modal>
  );
}

function ThreadCompanyMappingModal({
  open,
  currentCompanyName,
  search,
  options,
  showResults,
  loading,
  saving,
  disabled,
  onClose,
  onSearchChange,
  onSelectCompany,
  onSubmit,
}: {
  open: boolean;
  currentCompanyName: string;
  search: string;
  options: ThreadCompanyOption[];
  showResults: boolean;
  loading: boolean;
  saving: boolean;
  disabled: boolean;
  onClose: () => void;
  onSearchChange: (value: string) => void;
  onSelectCompany: (company: ThreadCompanyOption) => void;
  onSubmit: () => Promise<void>;
}) {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Map to Company"
      size="md"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={disabled || saving}
            onClick={() => void onSubmit()}
          >
            {saving ? "Applying..." : "Apply Changes"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-[#DBEAFE] bg-[#F8FBFF] px-4 py-3 text-sm text-slate-700">
          Current: {currentCompanyName || "Not mapped"}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Company Search
          </label>
          <input
            type="text"
            className="input-base"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Type at least 2 letters to search company name or domain"
            disabled={saving}
          />
        </div>
        {showResults ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50">
            {loading ? (
              <p className="px-4 py-3 text-sm text-slate-500">
                Searching companies...
              </p>
            ) : options.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-500">
                No company matches found.
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto p-2">
                {options.map((company) => {
                  return (
                    <button
                      key={company.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-white"
                      onClick={() => onSelectCompany(company)}
                    >
                      <span className="font-medium">{company.name}</span>
                      <span className="text-xs text-slate-500">
                        {company.domain || ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function TemplateEditorFields({
  mode,
  form,
  submitting,
  onChange,
}: {
  mode: "create" | "edit";
  form: TemplateFormState;
  submitting: boolean;
  onChange: (
    field: keyof TemplateFormState,
    value: TemplateFormFieldValue,
  ) => void;
}) {
  const editorRef = useRef<RichTextEditorHandle | null>(null);
  const variables = form.variables
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Template Name *
        </label>
        <input
          className="input-base"
          value={form.name}
          onChange={(event) => onChange("name", event.target.value)}
          placeholder="Placement invitation"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Slug *
        </label>
        <input
          className="input-base"
          value={form.slug}
          onChange={(event) => onChange("slug", slugify(event.target.value))}
          placeholder="placement-invitation"
          disabled={mode !== "create"}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Subject *
        </label>
        <input
          className="input-base"
          value={form.subject}
          onChange={(event) => onChange("subject", event.target.value)}
          placeholder="Invitation for Campus Placement 2026-27"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Variables
        </label>
        <input
          className="input-base"
          value={form.variables}
          onChange={(event) => onChange("variables", event.target.value)}
          placeholder="company_name, season_name, coordinator_name"
        />
        <p className="mt-1 text-xs text-slate-500">
          Add variable names here, then click a chip to insert placeholders like{" "}
          <code>{"{{company_name}}"}</code> into the editor.
        </p>
        <div className="mt-3 rounded-xl border border-[#DBEAFE] bg-[#F8FBFF] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#2563EB]">
            Predefined Variables
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PREDEFINED_TEMPLATE_VARIABLES.map((variable) => (
              <button
                key={variable.key}
                type="button"
                className="rounded-full border border-[#BFDBFE] bg-white px-3 py-1.5 text-xs font-medium text-[#1D4ED8] transition-colors hover:border-[#2563EB]"
                onClick={() =>
                  onChange(
                    "variables",
                    appendTemplateVariables(form.variables, [variable.key]),
                  )
                }
              >
                {variable.label}
              </button>
            ))}
          </div>
          {/* <div className="mt-3 space-y-1 text-[11px] text-slate-500">
            {PREDEFINED_TEMPLATE_VARIABLES.map((variable) => (
              <p key={`${variable.key}-hint`}>
                <strong className="text-slate-700">{variable.label}:</strong>{" "}
                {variable.description}
              </p>
            ))}
          </div> */}
        </div>
        {variables.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {variables.map((variable) => (
              <button
                key={variable}
                type="button"
                className="rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-1.5 text-xs font-medium text-[#1D4ED8] transition-colors hover:border-[#2563EB] hover:bg-white"
                onClick={() => editorRef.current?.insertText(`{{${variable}}}`)}
              >
                {variable}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Email Content *
        </label>
        <RichTextEditor
          ref={editorRef}
          value={form.contentHtml}
          onChange={(value) => onChange("contentHtml", value)}
          placeholder="Write your email here. Use the toolbar for bold, links, and lists."
        />
        <p className="mt-1 text-xs text-slate-500">
          Use the toolbar for basic formatting. Keep layouts simple for email
          clients.
        </p>
      </div>
      <div className="sm:col-span-2">
        <MailAttachmentInput
          value={form.attachments}
          onChange={(attachments) => onChange("attachments", attachments)}
          disabled={submitting}
          maxFiles={6}
        />
      </div>
      <details className="sm:col-span-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">
          Advanced options
        </summary>
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Plain Text Fallback
            </label>
            <textarea
              rows={4}
              className="input-base"
              value={form.plainTextFallback}
              onChange={(event) =>
                onChange("plainTextFallback", event.target.value)
              }
              placeholder="Optional plain text version for previews and fallback clients"
            />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            The editor stores rich email content directly. Use this section only
            if you want to customize the plain-text fallback.
          </div>
        </div>
      </details>
    </div>
  );
}

function TemplateEditorModal({
  open,
  mode,
  form,
  submitting,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  form: TemplateFormState;
  submitting: boolean;
  onChange: (
    field: keyof TemplateFormState,
    value: TemplateFormFieldValue,
  ) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const isCreate = mode === "create";
  const generatedTextPreview = htmlToPlainText(form.contentHtml);

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={isCreate ? "Create Template" : "Update Template"}
      size="lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={onSubmit}
            disabled={
              submitting ||
              !form.name.trim() ||
              !form.slug.trim() ||
              !form.subject.trim() ||
              !generatedTextPreview.trim()
            }
          >
            {submitting
              ? isCreate
                ? "Creating..."
                : "Saving..."
              : isCreate
                ? "Create"
                : "Save Changes"}
          </button>
        </>
      }
    >
      <TemplateEditorFields
        mode={mode}
        form={form}
        submitting={submitting}
        onChange={onChange}
      />
    </Modal>
  );
}

function DeleteTemplateModal({
  open,
  template,
  submitting,
  onClose,
  onConfirm,
}: {
  open: boolean;
  template: TemplateRecord | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Delete Template"
      size="sm"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? "Deleting..." : "Delete"}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        Delete <strong>{template?.name}</strong>? This only works for templates
        that have not been used in mail requests or sent emails.
      </p>
    </Modal>
  );
}

function TemplateDetailsModal({
  open,
  template,
  onClose,
  onEdit,
  onDelete,
}: {
  open: boolean;
  template: TemplateRecord | null;
  onClose: () => void;
  onEdit: (template: TemplateRecord) => void;
  onDelete: () => void;
}) {
  if (!template) return null;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={template.name}
      size="lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-danger" onClick={onDelete}>
            <Trash2 size={14} />
            Delete
          </button>
          <button className="btn btn-primary" onClick={() => onEdit(template)}>
            <Pencil size={14} />
            Edit
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={template.status} size="sm" />
            <p className="text-sm text-slate-500">{template.slug}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Creator
            </p>
            <p className="mt-1 text-sm font-medium text-slate-800">
              {template.creator?.name ?? "-"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Approved By
            </p>
            <p className="mt-1 text-sm font-medium text-slate-800">
              {template.approver?.name ?? "-"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Last Updated
            </p>
            <p className="mt-1 text-sm font-medium text-slate-800">
              {formatDateTime(template.updatedAt)}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Subject
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {template.subject}
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Variables
          </p>
          <div className="flex flex-wrap gap-2">
            {template.variables.length > 0 ? (
              template.variables.map((variable) => (
                <Badge key={variable} variant="gray" size="sm">
                  {variable}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-slate-500">
                No dynamic variables configured.
              </span>
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Default Attachments
          </p>
          <div className="flex flex-wrap gap-2">
            {template.attachments && template.attachments.length > 0 ? (
              template.attachments.map((attachment) => (
                <Badge key={attachment.storagePath} variant="gray" size="sm">
                  {attachment.fileName}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-slate-500">
                No default attachments configured.
              </span>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
            Template preview
          </div>
          <div
            className="prose prose-sm max-w-none p-4"
            dangerouslySetInnerHTML={{ __html: template.bodyHtml }}
          />
        </div>
      </div>
    </Modal>
  );
}

export default function MailingPage() {
  const [mode, setMode] = useState<ViewMode>("queue");
  const [search, setSearch] = useState("");

  const [queueStatusFilter, setQueueStatusFilter] = useState<string>("pending");
  const [queueTypeFilter, setQueueTypeFilter] = useState<string[]>([]);
  const [queueCoordinatorFilter, setQueueCoordinatorFilter] = useState<
    string[]
  >([]);
  const [previewMail, setPreviewMail] = useState<MailRequestRecord | null>(
    null,
  );
  const [replyMailboxEmail, setReplyMailboxEmail] =
    useState<MailboxEmailRecord | null>(null);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [templateDetailsOpen, setTemplateDetailsOpen] = useState(false);
  const [templateEditorMode, setTemplateEditorMode] = useState<
    "create" | "edit"
  >("create");
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(
    buildTemplateFormState(),
  );
  const [templateDeleteOpen, setTemplateDeleteOpen] = useState(false);
  const [isWideTemplateViewport, setIsWideTemplateViewport] = useState(false);

  const [mailboxBucket] = useState<MailboxBucket>("all");
  const [selectedMailboxId, setSelectedMailboxId] = useState<string | null>(
    null,
  );

  const [mailRequests, setMailRequests] = useState<MailRequestRecord[]>([]);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [mailboxEmails, setMailboxEmails] = useState<MailboxEmailRecord[]>([]);
  const [mailboxPage, setMailboxPage] = useState(1);
  const [mailboxMeta, setMailboxMeta] = useState<MailboxMeta>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });

  const [queueLoading, setQueueLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [mailboxLoading, setMailboxLoading] = useState(false);
  const [mailboxSyncing, setMailboxSyncing] = useState(false);

  const [queueError, setQueueError] = useState("");
  const [templatesError, setTemplatesError] = useState("");
  const [mailboxError, setMailboxError] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [threadCompanySearch, setThreadCompanySearch] = useState("");
  const [threadCompanyOptions, setThreadCompanyOptions] = useState<
    ThreadCompanyOption[]
  >([]);
  const [selectedThreadCompanyId, setSelectedThreadCompanyId] = useState("");
  const [threadCompanyLoading, setThreadCompanyLoading] = useState(false);
  const [threadCompanySaving, setThreadCompanySaving] = useState(false);
  const [threadCompanyResultsVisible, setThreadCompanyResultsVisible] =
    useState(false);

  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [templateSubmitting, setTemplateSubmitting] = useState(false);
  const [previewSubmitting, setPreviewSubmitting] = useState(false);
  const [mailboxReplySubmitting, setMailboxReplySubmitting] = useState(false);
  const [threadCompanyModalOpen, setThreadCompanyModalOpen] = useState(false);
  const [mailboxComposeOpen, setMailboxComposeOpen] = useState(false);

  async function loadQueue() {
    setQueueLoading(true);
    setQueueError("");
    try {
      const response = await requestJson<MailRequestRecord[]>(
        "/api/v1/mail/requests",
      );
      setMailRequests(response.data ?? []);
    } catch (error) {
      setQueueError(
        error instanceof Error ? error.message : "Unable to load mail queue",
      );
    } finally {
      setQueueLoading(false);
    }
  }

  async function loadTemplates() {
    setTemplatesLoading(true);
    setTemplatesError("");
    try {
      const response = await requestJson<TemplateRecord[]>(
        "/api/v1/mail/templates",
      );
      setTemplates(response.data ?? []);
    } catch (error) {
      setTemplatesError(
        error instanceof Error ? error.message : "Unable to load templates",
      );
    } finally {
      setTemplatesLoading(false);
    }
  }

  const loadMailbox = useCallback(
    async (bucket: MailboxBucket, page = 1) => {
      setMailboxLoading(true);
      setMailboxError("");
      try {
        const response = await requestJson<MailboxEmailRecord[]>(
          `/api/v1/email/inbox?bucket=${bucket}&page=${page}&limit=${mailboxMeta.limit}`,
        );
        setMailboxEmails(response.data ?? []);
        setMailboxMeta({
          page: Number(response.meta?.page ?? page),
          limit: Number(response.meta?.limit ?? mailboxMeta.limit),
          total: Number(response.meta?.total ?? 0),
          totalPages: Number(response.meta?.totalPages ?? 1),
        });
        setMailboxPage(Number(response.meta?.page ?? page));
      } catch (error) {
        setMailboxError(
          error instanceof Error
            ? error.message
            : "Mailbox is not available right now",
        );
        setMailboxEmails([]);
        setMailboxMeta((current) => ({
          ...current,
          total: 0,
          totalPages: 1,
        }));
      } finally {
        setMailboxLoading(false);
      }
    },
    [mailboxMeta.limit],
  );

  async function handleSyncInbound() {
    setMailboxSyncing(true);
    setMailboxError("");
    try {
      await requestJson<{ syncedCount: number }>("/api/v1/email/inbox/sync", {
        method: "POST",
      });
      await loadMailbox(mailboxBucket, mailboxPage);
      showMessage("Inbox sync completed.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sync mailbox";
      setMailboxError(message);
      showMessage(message);
    } finally {
      setMailboxSyncing(false);
    }
  }

  useEffect(() => {
    void Promise.all([loadQueue(), loadTemplates()]);
  }, []);

  useEffect(() => {
    if (mode === "mailbox") {
      void loadMailbox(mailboxBucket, mailboxPage);
    }
  }, [loadMailbox, mailboxBucket, mailboxPage, mode]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(min-width: 1280px)");
    const syncViewport = () => setIsWideTemplateViewport(mediaQuery.matches);

    syncViewport();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncViewport);
      return () => mediaQuery.removeEventListener("change", syncViewport);
    }

    mediaQuery.addListener(syncViewport);
    return () => mediaQuery.removeListener(syncViewport);
  }, []);

  const coordinatorOptions = useMemo(
    () =>
      Array.from(
        new Map(
          mailRequests.map((request) => [
            request.requester.name,
            { value: request.requester.name, label: request.requester.name },
          ]),
        ).values(),
      ),
    [mailRequests],
  );

  const filteredQueue = useMemo(() => {
    const query = search.trim().toLowerCase();

    return mailRequests.filter((mail) => {
      if (queueStatusFilter && mail.status !== queueStatusFilter) return false;
      if (
        queueTypeFilter.length > 0 &&
        !queueTypeFilter.includes(mail.requestType)
      ) {
        return false;
      }
      if (
        queueCoordinatorFilter.length > 0 &&
        !queueCoordinatorFilter.includes(mail.requester.name)
      ) {
        return false;
      }
      if (!query) return true;

      return [
        getMailCompanyName(mail),
        mail.requester.name,
        getMailSubject(mail),
        mail.template?.name ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [
    mailRequests,
    queueCoordinatorFilter,
    queueStatusFilter,
    queueTypeFilter,
    search,
  ]);

  const queueStats = useMemo(
    () => ({
      pending: mailRequests.filter((mail) => mail.status === "pending").length,
      sent: mailRequests.filter((mail) => mail.status === "sent").length,
      rejected: mailRequests.filter((mail) => mail.status === "rejected")
        .length,
    }),
    [mailRequests],
  );

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();

    return templates.filter((template) => {
      if (!query) return true;
      return [
        template.name,
        template.subject,
        template.slug,
        template.creator?.name ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [search, templates]);

  useEffect(() => {
    if (!filteredTemplates.length) {
      setSelectedTemplateId(null);
      setTemplateDetailsOpen(false);
      return;
    }

    const hasSelected =
      selectedTemplateId &&
      filteredTemplates.some((item) => item.id === selectedTemplateId);

    if (isWideTemplateViewport) {
      if (!hasSelected) {
        setSelectedTemplateId(filteredTemplates[0].id);
      }
      setTemplateDetailsOpen(false);
      return;
    }

    if (!hasSelected) {
      setSelectedTemplateId(null);
      setTemplateDetailsOpen(false);
    }
  }, [filteredTemplates, isWideTemplateViewport, selectedTemplateId]);

  const selectedTemplate =
    filteredTemplates.find((template) => template.id === selectedTemplateId) ??
    null;

  const filteredMailbox = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return mailboxEmails;

    return mailboxEmails.filter((email) =>
      [email.subject ?? "", email.fromEmail ?? "", email.company?.name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [mailboxEmails, search]);
  const mailboxThreads = useMemo(() => {
    const threadMap = new Map<
      string,
      {
        key: string;
        latest: MailboxEmailRecord;
        emails: MailboxEmailRecord[];
      }
    >();

    for (const email of filteredMailbox) {
      const key = getMailboxThreadKey(email);
      const existing = threadMap.get(key);

      if (!existing) {
        threadMap.set(key, {
          key,
          latest: email,
          emails: [email],
        });
        continue;
      }

      existing.emails.push(email);
      if (
        new Date(email.createdAt ?? 0).getTime() >
        new Date(existing.latest.createdAt ?? 0).getTime()
      ) {
        existing.latest = email;
      }
    }

    return Array.from(threadMap.values())
      .map((thread) => ({
        ...thread,
        emails: thread.emails.sort(
          (left, right) =>
            new Date(left.createdAt ?? 0).getTime() -
            new Date(right.createdAt ?? 0).getTime(),
        ),
      }))
      .sort(
        (left, right) =>
          new Date(right.latest.createdAt ?? 0).getTime() -
          new Date(left.latest.createdAt ?? 0).getTime(),
      );
  }, [filteredMailbox]);

  useEffect(() => {
    if (!mailboxThreads.length) {
      setSelectedMailboxId(null);
      return;
    }

    if (
      selectedMailboxId &&
      !mailboxThreads.some((thread) => thread.key === selectedMailboxId)
    ) {
      setSelectedMailboxId(null);
    }
  }, [mailboxThreads, selectedMailboxId]);

  const selectedMailboxThread =
    mailboxThreads.find((thread) => thread.key === selectedMailboxId) ?? null;
  const selectedMailboxCompany =
    selectedMailboxThread?.emails.find((email) => email.company?.id)?.company ??
    null;
  const selectedMailboxCompanyId = selectedMailboxCompany?.id ?? "";
  const selectedMailboxCompanyName = selectedMailboxCompany?.name ?? "";

  function openThreadCompanyModal() {
    setSelectedThreadCompanyId(selectedMailboxCompanyId);
    setThreadCompanySearch(selectedMailboxCompanyName);
    setThreadCompanyOptions([]);
    setThreadCompanyResultsVisible(false);
    setThreadCompanyModalOpen(true);
  }

  function closeThreadCompanyModal() {
    setThreadCompanyModalOpen(false);
    setSelectedThreadCompanyId(selectedMailboxCompanyId);
    setThreadCompanySearch(selectedMailboxCompanyName);
    setThreadCompanyOptions([]);
    setThreadCompanyResultsVisible(false);
  }

  function showMessage(message: string) {
    setPageMessage(message);
    window.setTimeout(() => {
      setPageMessage((current) => (current === message ? "" : current));
    }, 2600);
  }

  useEffect(() => {
    if (mode !== "mailbox") return;
    if (!threadCompanyModalOpen || !threadCompanyResultsVisible) return;

    const query = threadCompanySearch.trim();
    if (query.length < 2) {
      setThreadCompanyOptions([]);
      return;
    }

    let active = true;
    setThreadCompanyLoading(true);

    void requestJson<ThreadCompanyOption[]>(
      `/api/v1/companies?search=${encodeURIComponent(query)}&page=1&limit=8`,
    )
      .then((response) => {
        if (!active) return;
        setThreadCompanyOptions(response.data ?? []);
      })
      .catch(() => {
        if (!active) return;
        setThreadCompanyOptions([]);
      })
      .finally(() => {
        if (active) {
          setThreadCompanyLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    mode,
    threadCompanyModalOpen,
    threadCompanyResultsVisible,
    threadCompanySearch,
  ]);

  async function handleApproveRequest(requestId: string, sendAt?: string) {
    setBusyIds((current) => new Set(current).add(requestId));
    try {
      const response = await requestJson<MailRequestRecord>(
        `/api/v1/mail/requests/${requestId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sendAt: sendAt ? new Date(sendAt).toISOString() : undefined,
          }),
        },
      );

      const updated = response.data;
      if (updated) {
        setMailRequests((current) =>
          current.map((mail) =>
            mail.id === requestId ? { ...mail, ...updated } : mail,
          ),
        );
      }
      showMessage(
        updated?.status === "sent"
          ? "Mail sent successfully."
          : sendAt
            ? "Mail scheduled successfully."
            : "Mail approved successfully.",
      );
      return true;
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Unable to approve mail request",
      );
      return false;
    } finally {
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(requestId);
        return next;
      });
    }
  }

  async function handleSubmitMailboxReply(payload: {
    email?: MailboxEmailRecord | null;
    toEmails: string[];
    ccEmails: string[];
    subject: string;
    htmlBody: string;
    attachments: MailAttachmentMeta[];
    sendNow: boolean;
  }) {
    setMailboxReplySubmitting(true);
    try {
      const createdResponse = await requestJson<MailRequestRecord>(
        "/api/v1/mail/requests",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId: payload.email?.company?.id ?? undefined,
            requestType: "custom",
            customSubject: payload.subject,
            customBody: payload.htmlBody,
            previewPayload: {
              subject: payload.subject,
              htmlBody: payload.htmlBody,
              textBody: htmlToPlainText(payload.htmlBody),
              attachments: payload.attachments,
            },
            attachments: payload.attachments,
            recipientFilter: {
              emails: payload.toEmails,
              ccEmails: payload.ccEmails,
              replyContext: payload.email
                ? {
                    threadId: payload.email.threadId ?? undefined,
                    messageId: payload.email.messageId ?? undefined,
                    references: payload.email.references ?? [],
                  }
                : undefined,
            },
          }),
        },
      );

      const created = createdResponse.data;
      if (!created) {
        throw new Error("Reply draft could not be created");
      }

      const approved = await handleApproveRequest(created.id);
      if (approved) {
        await Promise.all([
          loadQueue(),
          loadMailbox(mailboxBucket, mailboxPage),
        ]);
        setReplyMailboxEmail(null);
        setMailboxComposeOpen(false);
      }
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : payload.email
            ? "Unable to prepare reply"
            : "Unable to prepare mail",
      );
    } finally {
      setMailboxReplySubmitting(false);
    }
  }

  async function handleSaveThreadCompanyMapping() {
    const threadId = selectedMailboxThread?.latest.threadId?.trim();
    if (!threadId || !selectedThreadCompanyId) {
      return;
    }

    setThreadCompanySaving(true);
    try {
      const response = await requestJson<{
        company: { id: string; name: string };
        updatedEmails: number;
      }>(`/api/v1/email/threads/${encodeURIComponent(threadId)}/company`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: selectedThreadCompanyId }),
      });

      await loadMailbox(mailboxBucket, mailboxPage);
      closeThreadCompanyModal();
      showMessage(
        `Thread mapped to ${response.data?.company.name ?? "selected company"} across ${
          response.data?.updatedEmails ?? 0
        } mail${response.data?.updatedEmails === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Unable to update thread-company mapping",
      );
    } finally {
      setThreadCompanySaving(false);
    }
  }

  async function handleRejectRequest(requestId: string, note: string) {
    if (!note.trim()) return;

    setRejectSubmitting(true);
    setBusyIds((current) => new Set(current).add(requestId));
    try {
      const response = await requestJson<MailRequestRecord>(
        `/api/v1/mail/requests/${requestId}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewNote: note.trim() }),
        },
      );

      const updated = response.data;
      if (updated) {
        setMailRequests((current) =>
          current.map((mail) =>
            mail.id === requestId ? { ...mail, ...updated } : mail,
          ),
        );
        setPreviewMail((current) =>
          current && current.id === requestId
            ? { ...current, ...updated }
            : current,
        );
      }
      setPreviewMail(null);
      showMessage("Mail request rejected.");
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Unable to reject mail request",
      );
    } finally {
      setRejectSubmitting(false);
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(requestId);
        return next;
      });
    }
  }

  function updateTemplateForm(
    field: keyof TemplateFormState,
    value: TemplateFormFieldValue,
  ) {
    setTemplateForm((current) => {
      if (
        field === "name" &&
        templateEditorMode === "create" &&
        !current.slug
      ) {
        const nextName = String(value);
        return {
          ...current,
          name: nextName,
          slug: slugify(nextName),
        };
      }

      return {
        ...current,
        [field]: value,
      };
    });
  }

  function openCreateTemplate() {
    setTemplateEditorMode("create");
    setTemplateForm(buildTemplateFormState());
    setTemplateEditorOpen(true);
  }

  function openEditTemplate(template: TemplateRecord) {
    setTemplateEditorMode("edit");
    setTemplateForm(buildTemplateFormState(template));
    setTemplateEditorOpen(true);
  }

  async function handleSubmitTemplate() {
    const payload = {
      name: templateForm.name.trim(),
      slug: templateForm.slug.trim(),
      subject: templateForm.subject.trim(),
      bodyHtml: templateForm.contentHtml.trim(),
      bodyText:
        templateForm.plainTextFallback.trim() ||
        htmlToPlainText(templateForm.contentHtml) ||
        undefined,
      variables: templateForm.variables
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      attachments: templateForm.attachments,
    };

    setTemplateSubmitting(true);
    try {
      if (templateEditorMode === "create") {
        const response = await requestJson<TemplateRecord>(
          "/api/v1/mail/templates",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const created = response.data;
        if (created) {
          setTemplates((current) => [created, ...current]);
          setSelectedTemplateId(created.id);
        }
        showMessage("Template created.");
      } else if (selectedTemplateId) {
        const response = await requestJson<TemplateRecord>(
          `/api/v1/mail/templates/${selectedTemplateId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: payload.name,
              subject: payload.subject,
              bodyHtml: payload.bodyHtml,
              bodyText: payload.bodyText,
              variables: payload.variables,
              attachments: payload.attachments,
            }),
          },
        );
        const updated = response.data;
        if (updated) {
          setTemplates((current) =>
            current.map((template) =>
              template.id === selectedTemplateId
                ? { ...template, ...updated }
                : template,
            ),
          );
        }
        showMessage("Template updated.");
      }

      setTemplateEditorOpen(false);
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Unable to save template",
      );
    } finally {
      setTemplateSubmitting(false);
    }
  }

  async function handleDeleteTemplate() {
    if (!selectedTemplateId) return;

    setTemplateSubmitting(true);
    try {
      await requestJson(`/api/v1/mail/templates/${selectedTemplateId}`, {
        method: "DELETE",
      });
      setTemplates((current) =>
        current.filter((template) => template.id !== selectedTemplateId),
      );
      setTemplateDetailsOpen(false);
      setTemplateDeleteOpen(false);
      showMessage("Template deleted.");
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Unable to delete template",
      );
    } finally {
      setTemplateSubmitting(false);
    }
  }

  async function handleSavePreviewMail(
    mail: MailRequestRecord,
    payload: { subject: string; htmlBody: string; ccEmails: string[] },
  ) {
    setPreviewSubmitting(true);
    try {
      const response = await requestJson<MailRequestRecord>(
        `/api/v1/mail/requests/${mail.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const updated = response.data;
      if (updated) {
        setMailRequests((current) =>
          current.map((item) =>
            item.id === mail.id ? { ...item, ...updated } : item,
          ),
        );
        setPreviewMail((current) =>
          current && current.id === mail.id
            ? { ...current, ...updated }
            : current,
        );
      }
      showMessage("Mail content updated.");
    } finally {
      setPreviewSubmitting(false);
    }
  }

  const showInlineTemplateEditor =
    mode === "templates" && templateEditorOpen && isWideTemplateViewport;
  const showTemplateDetailPane =
    mode === "templates" && isWideTemplateViewport && Boolean(selectedTemplate);

  return (
    <div className="-mt-6 relative z-10 space-y-5 px-4 pb-6 pt-6 xl:mt-0 xl:h-full xl:overflow-y-auto hide-scrollbar">
      <div className="card overflow-hidden">
        <div className="border-b border-(--card-border) px-4 py-3">
          <div className="flex justify-center">
            <div className="flex overflow-x-auto rounded-2xl bg-slate-100 p-1">
              {VIEW_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isActive = option.value === mode;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMode(option.value)}
                    className={`flex min-w-fit items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-[#2563EB] text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <Icon size={16} />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-4 py-3">
          <div
            className={`flex gap-2 ${
              mode === "mailbox"
                ? "flex-row items-center"
                : "flex-col xl:flex-row xl:flex-wrap xl:items-center"
            }`}
          >
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={
                mode === "queue"
                  ? "Search by company, coordinator, subject, or template..."
                  : mode === "templates"
                    ? "Search templates by name, subject, or slug..."
                    : "Search mailbox threads by sender, recipient, company, or subject..."
              }
              className={`min-w-0 ${mode === "templates" ? "xl:min-w-[320px] xl:flex-[1.2]" : "flex-1"}`}
            />

            {mode === "mailbox" && (
              <button
                type="button"
                className="btn btn-ghost btn-sm shrink-0 gap-1"
                onClick={() => void loadMailbox(mailboxBucket, mailboxPage)}
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            )}

            {mode === "queue" && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:w-auto xl:shrink-0">
                <FilterSelect
                  multiple
                  value={queueTypeFilter}
                  onChange={setQueueTypeFilter}
                  options={QUEUE_TYPE_OPTIONS}
                  placeholder="Type"
                  className="z-20 w-full xl:w-36"
                />
                <FilterSelect
                  multiple
                  value={queueCoordinatorFilter}
                  onChange={setQueueCoordinatorFilter}
                  options={coordinatorOptions}
                  placeholder="Coordinator"
                  className="z-20 w-full xl:w-44"
                />
              </div>
            )}

            {mode === "templates" && (
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end xl:w-auto xl:shrink-0">
                <button
                  className="btn btn-primary btn-sm gap-1 sm:shrink-0"
                  onClick={openCreateTemplate}
                >
                  <Plus size={14} />
                  New Template
                </button>
              </div>
            )}

            {mode === "queue" &&
              (queueTypeFilter.length > 0 ||
                queueCoordinatorFilter.length > 0) && (
                <button
                  className="btn btn-ghost btn-sm shrink-0 self-start text-slate-500 hover:text-slate-700 xl:self-auto"
                  onClick={() => {
                    setQueueTypeFilter([]);
                    setQueueCoordinatorFilter([]);
                  }}
                >
                  Clear all
                </button>
              )}
          </div>
        </div>
      </div>

      {pageMessage && (
        <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm font-medium text-[#1D4ED8]">
          {pageMessage}
        </div>
      )}

      {mode === "queue" && (
        <div className="card overflow-hidden">
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard
                icon={Inbox}
                label="Pending"
                value={queueStats.pending}
                active={queueStatusFilter === "pending"}
                onClick={() =>
                  setQueueStatusFilter(
                    queueStatusFilter === "pending" ? "" : "pending",
                  )
                }
              />
              <StatCard
                icon={Send}
                label="Sent"
                value={queueStats.sent}
                active={queueStatusFilter === "sent"}
                onClick={() =>
                  setQueueStatusFilter(
                    queueStatusFilter === "sent" ? "" : "sent",
                  )
                }
              />
              <StatCard
                icon={XCircle}
                label="Rejected"
                value={queueStats.rejected}
                active={queueStatusFilter === "rejected"}
                onClick={() =>
                  setQueueStatusFilter(
                    queueStatusFilter === "rejected" ? "" : "rejected",
                  )
                }
              />
            </div>

            {queueLoading ? (
              <SectionSkeleton cards={4} detail={false} />
            ) : queueError ? (
              <EmptyState
                icon={AlertCircle}
                title="Unable to load mail queue"
                description={queueError}
                action={
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => void loadQueue()}
                  >
                    Retry
                  </button>
                }
              />
            ) : filteredQueue.length === 0 ? (
              <EmptyState
                icon={Mail}
                title="No mail requests found"
                description="Try changing the filters or search query."
              />
            ) : (
              <div className="space-y-3">
                {filteredQueue.map((mail) => {
                  return (
                    <div
                      key={mail.id}
                      className="rounded-2xl border border-[#DBEAFE] bg-white p-4 transition-all hover:border-[#BFDBFE]"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
                        <div className="flex min-w-0 flex-1 gap-3">
                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-base font-semibold text-slate-900">
                                    {getMailCompanyName(mail)}
                                  </p>
                                  <Badge
                                    size="sm"
                                    variant={
                                      mail.requestType === "template"
                                        ? "purple"
                                        : "info"
                                    }
                                  >
                                    {mail.requestType === "template" ? (
                                      <>
                                        <LayoutTemplate
                                          size={10}
                                          className="mr-1 inline"
                                        />
                                        Template
                                      </>
                                    ) : (
                                      <>
                                        <FileText
                                          size={10}
                                          className="mr-1 inline"
                                        />
                                        Custom
                                      </>
                                    )}
                                  </Badge>
                                  <StatusBadge status={mail.status} size="sm" />
                                </div>
                                <p className="mt-1 text-sm font-medium text-slate-700">
                                  {getMailSubject(mail)}
                                </p>
                                <div className="mt-2 space-y-1 text-xs text-slate-500">
                                  <p className="break-words">
                                    <span className="font-semibold text-slate-600">
                                      To:
                                    </span>{" "}
                                    {getMailToRecipients(mail)}
                                  </p>
                                  <p className="break-words">
                                    <span className="font-semibold text-slate-600">
                                      From:
                                    </span>{" "}
                                    {getMailFromAddress(mail)}
                                  </p>
                                </div>
                                <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                                  {getMailPreview(mail)}
                                </p>
                              </div>

                              {mail.urgency && mail.urgency >= 4 && (
                                <Badge variant="warning" size="sm">
                                  High priority
                                </Badge>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <User2 size={12} />
                                {mail.requester.name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock3 size={12} />
                                Requested {formatDateTime(mail.createdAt)}
                              </span>
                              {mail.template?.name && (
                                <span className="flex items-center gap-1 text-[#2563EB]">
                                  <LayoutTemplate size={12} />
                                  {mail.template.name}
                                </span>
                              )}
                              {mail.reviewer?.name && (
                                <span>Reviewed by {mail.reviewer.name}</span>
                              )}
                              {getMailAttachments(mail).length > 0 && (
                                <span className="flex items-center gap-1 text-slate-600">
                                  <Paperclip size={12} />
                                  {getMailAttachments(mail).length} attachment
                                  {getMailAttachments(mail).length > 1
                                    ? "s"
                                    : ""}
                                </span>
                              )}
                            </div>

                            {mail.reviewNote && (
                              <div className="flex gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                                <AlertCircle
                                  size={12}
                                  className="mt-0.5 shrink-0"
                                />
                                <span>
                                  <strong>Review note:</strong>{" "}
                                  {mail.reviewNote}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2 xl:w-auto xl:justify-end">
                          <button
                            className="btn btn-primary btn-sm gap-1"
                            onClick={() => setPreviewMail(mail)}
                          >
                            <Eye size={14} />
                            {mail.status === "pending" ? "Review" : "View"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {mode === "templates" && (
        <div className="space-y-4">
          {/* <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard icon={FileText} label="Draft" value={templateStats.draft} />
            <StatCard
              icon={CheckCircle2}
              label="Approved"
              value={templateStats.approved}
            />
            <StatCard icon={Sparkles} label="Archived" value={templateStats.archived} />
          </div> */}

          {templatesLoading ? (
            <SectionSkeleton />
          ) : templatesError ? (
            <div className="card overflow-hidden p-4">
              <EmptyState
                icon={AlertCircle}
                title="Unable to load templates"
                description={templatesError}
                action={
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => void loadTemplates()}
                  >
                    Retry
                  </button>
                }
              />
            </div>
          ) : filteredTemplates.length === 0 && !showInlineTemplateEditor ? (
            <div className="grid gap-4">
              <div className="card flex min-h-[620px] items-center justify-center border border-[#DBEAFE] p-4">
                <EmptyState
                  icon={LayoutTemplate}
                  title="No templates found"
                  description="Try changing the search query."
                />
              </div>
            </div>
          ) : (
            <div
              className={`grid gap-4 ${
                showInlineTemplateEditor || showTemplateDetailPane
                  ? "xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.9fr)]"
                  : "grid-cols-1"
              }`}
            >
              <div className="card min-h-[620px] border border-[#DBEAFE] p-4">
                <div className="flex h-full flex-col">
                  {filteredTemplates.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[#BFDBFE] bg-[#F8FBFF] px-5 py-10 text-center">
                      <div>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-sm">
                          <LayoutTemplate size={22} />
                        </div>
                        <p className="mt-4 text-base font-semibold text-slate-800">
                          Start your first template
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          The editor is open on the right. Fill in the details
                          and save when ready.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredTemplates.map((template) => {
                        const selected =
                          isWideTemplateViewport &&
                          template.id === selectedTemplateId;
                        return (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => {
                              setSelectedTemplateId(template.id);
                              if (!isWideTemplateViewport) {
                                setTemplateDetailsOpen(true);
                              }
                            }}
                            className={`w-full rounded-2xl border p-4 text-left transition-all ${
                              selected
                                ? "border-[#2563EB] bg-[#EFF6FF]"
                                : "border-[#DBEAFE] bg-white hover:border-[#BFDBFE]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-slate-900">
                                    {template.name}
                                  </p>
                                  <StatusBadge
                                    status={template.status}
                                    size="sm"
                                  />
                                </div>
                                <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                                  {template.subject}
                                </p>
                              </div>
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                                <span className="text-sm font-bold">
                                  {getInitials(template.name) || "TM"}
                                </span>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <Badge variant="info" size="sm">
                                {template._count?.versions ?? 0} versions
                              </Badge>
                              <Badge variant="gray" size="sm">
                                {template._count?.mailRequests ?? 0} requests
                              </Badge>
                              <span>
                                Updated {formatDate(template.updatedAt)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {(showInlineTemplateEditor || showTemplateDetailPane) && (
                <div className="card min-h-[620px] border border-[#DBEAFE] p-5">
                  {showInlineTemplateEditor ? (
                    <>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-900">
                              {templateEditorMode === "create"
                                ? "Create Template"
                                : "Update Template"}
                            </h3>
                            <Badge variant="info" size="sm">
                              Inline editor
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            Editing stays inside the right panel on wide
                            screens.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setTemplateEditorOpen(false)}
                          >
                            Cancel
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => void handleSubmitTemplate()}
                            disabled={
                              templateSubmitting ||
                              !templateForm.name.trim() ||
                              !templateForm.slug.trim() ||
                              !templateForm.subject.trim() ||
                              !htmlToPlainText(templateForm.contentHtml).trim()
                            }
                          >
                            {templateSubmitting
                              ? templateEditorMode === "create"
                                ? "Creating..."
                                : "Saving..."
                              : templateEditorMode === "create"
                                ? "Create"
                                : "Save Changes"}
                          </button>
                        </div>
                      </div>

                      <div className="mt-4">
                        <TemplateEditorFields
                          mode={templateEditorMode}
                          form={templateForm}
                          submitting={templateSubmitting}
                          onChange={updateTemplateForm}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-900">
                              {selectedTemplate!.name}
                            </h3>
                            <StatusBadge
                              status={selectedTemplate!.status}
                              size="sm"
                            />
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            {selectedTemplate!.slug}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="btn btn-secondary btn-sm gap-1"
                            onClick={() => openEditTemplate(selectedTemplate!)}
                          >
                            <Pencil size={14} />
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm gap-1"
                            onClick={() => setTemplateDeleteOpen(true)}
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Creator
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {selectedTemplate!.creator?.name ?? "-"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Approved By
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {selectedTemplate!.approver?.name ?? "-"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Last Updated
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {formatDateTime(selectedTemplate!.updatedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Subject
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {selectedTemplate!.subject}
                        </p>
                      </div>

                      <div className="mt-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Variables
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedTemplate!.variables.length > 0 ? (
                            selectedTemplate!.variables.map((variable) => (
                              <Badge key={variable} variant="gray" size="sm">
                                {variable}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-slate-500">
                              No dynamic variables configured.
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Default Attachments
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedTemplate!.attachments &&
                          selectedTemplate!.attachments.length > 0 ? (
                            selectedTemplate!.attachments.map((attachment) => (
                              <Badge
                                key={attachment.storagePath}
                                variant="gray"
                                size="sm"
                              >
                                {attachment.fileName}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-slate-500">
                              No default attachments configured.
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
                          Template preview
                        </div>
                        <div
                          className="prose prose-sm max-w-none p-4"
                          dangerouslySetInnerHTML={{
                            __html: selectedTemplate!.bodyHtml,
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {mode === "mailbox" && (
        <div className="card overflow-hidden">
          <div className="space-y-4 p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                {selectedMailboxThread ? (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm px-2"
                    onClick={() => setSelectedMailboxId(null)}
                    aria-label="Back to mailbox"
                  >
                    <ArrowLeft size={14} />
                  </button>
                ) : null}
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <span>Mailbox</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm gap-1"
                  onClick={() => void handleSyncInbound()}
                  disabled={mailboxSyncing}
                >
                  <RefreshCw
                    size={14}
                    className={mailboxSyncing ? "animate-spin" : undefined}
                  />
                  {mailboxSyncing ? "Syncing..." : "Sync"}
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm gap-1"
                  onClick={() => setMailboxComposeOpen(true)}
                >
                  <Plus size={14} />
                  Compose
                </button>
              </div>
            </div>

            {mailboxLoading ? (
              <SectionSkeleton detail={false} />
            ) : mailboxError ? (
              <EmptyState
                icon={Inbox}
                title="Mailbox is not available yet"
                description={mailboxError}
                action={
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => void loadMailbox(mailboxBucket, mailboxPage)}
                  >
                    Retry
                  </button>
                }
              />
            ) : mailboxThreads.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No mailbox threads found"
                description="Inbound and outbound mailbox threads will appear here."
              />
            ) : selectedMailboxThread ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold text-slate-900">
                      {selectedMailboxThread.latest.subject || "No subject"}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {selectedMailboxThread.emails.length} mail
                      {selectedMailboxThread.emails.length > 1 ? "s" : ""} in
                      this thread
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm gap-2 self-start"
                    onClick={openThreadCompanyModal}
                  >
                    <Building2 size={14} />
                    <span>
                      {selectedMailboxCompany?.name ?? "Map to Company"}
                    </span>
                    <span aria-hidden="true" className="text-white/70">
                      |
                    </span>
                    <DropdownCaretIcon className="h-2.5 w-2.5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {selectedMailboxThread.emails.map((email) => (
                    <div
                      key={email.id}
                      className="rounded-2xl border border-[#DBEAFE] bg-white p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-semibold text-slate-900">
                            {email.subject || "No subject"}
                          </h4>
                          <Badge
                            variant={
                              email.direction === "inbound" ? "info" : "gray"
                            }
                            size="sm"
                          >
                            {email.direction === "inbound"
                              ? "Inbound"
                              : "Outbound"}
                          </Badge>
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm gap-1"
                          disabled={!canReplyToMailboxEmail(email)}
                          onClick={() => setReplyMailboxEmail(email)}
                        >
                          <Send size={12} />
                          Reply
                        </button>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            To
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {email.toEmails?.length
                              ? email.toEmails.join(", ")
                              : "-"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            From
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {email.fromEmail || "-"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {email.direction === "inbound"
                              ? "Received"
                              : "Sent"}
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {formatDateTime(email.createdAt)}
                          </p>
                        </div>
                      </div>

                      {email.ccEmails && email.ccEmails.length > 0 && (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                          <p>
                            <strong>CC:</strong> {email.ccEmails.join(", ")}
                          </p>
                        </div>
                      )}

                      {/* {email.classification && (
                          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Classification
                            </p>
                            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-600">
                              {JSON.stringify(email.classification, null, 2)}
                            </pre>
                          </div>
                        )} */}

                      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
                          Message body
                        </div>
                        {email.htmlBody ? (
                          <iframe
                            title={`Mailbox email ${email.id}`}
                            srcDoc={buildInboundHtmlDocument(email.htmlBody)}
                            sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                            scrolling="no"
                            className="w-full bg-white"
                            style={{ height: 240 }}
                            onLoad={(event) =>
                              resizeInboundFramePreservingScroll(
                                event.currentTarget as HTMLIFrameElement,
                              )
                            }
                          />
                        ) : (
                          <div className="whitespace-pre-wrap p-4 text-sm leading-relaxed text-slate-700">
                            {email.textBody || "No body content available."}
                          </div>
                        )}
                      </div>

                      {email.attachments && email.attachments.length > 0 && (
                        <div className="mt-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Attachments
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {email.attachments.map((attachment) => (
                              <Badge
                                key={attachment.id}
                                variant="gray"
                                size="sm"
                              >
                                {attachment.fileName}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  {mailboxThreads.map((thread) => (
                    <button
                      key={thread.key}
                      type="button"
                      onClick={() => setSelectedMailboxId(thread.key)}
                      className="w-full rounded-2xl border border-[#DBEAFE] bg-white p-4 text-left transition-all hover:border-[#BFDBFE]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                          <Mail size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-semibold text-slate-900">
                              {thread.latest.subject || "No subject"}
                            </p>
                            <Badge
                              variant={
                                thread.latest.direction === "inbound"
                                  ? "info"
                                  : "gray"
                              }
                              size="sm"
                            >
                              {thread.latest.direction === "inbound"
                                ? "Inbound"
                                : "Outbound"}
                            </Badge>
                            {thread.latest.company?.name && (
                              <Badge variant="info" size="sm">
                                {thread.latest.company.name}
                              </Badge>
                            )}
                            {thread.emails.length > 1 && (
                              <Badge variant="gray" size="sm">
                                {thread.emails.length} in thread
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            {thread.latest.direction === "inbound"
                              ? "From "
                              : "To "}
                            {thread.latest.direction === "inbound"
                              ? thread.latest.fromEmail || "Unknown sender"
                              : thread.latest.toEmails?.length
                                ? thread.latest.toEmails.join(", ")
                                : "Unknown recipient"}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span>
                              {formatDateTime(thread.latest.createdAt)}
                            </span>
                            {thread.latest.attachments &&
                              thread.latest.attachments.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Paperclip size={11} />
                                  {thread.latest.attachments.length} attachment
                                  {thread.latest.attachments.length > 1
                                    ? "s"
                                    : ""}
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-600">
                    Page {mailboxMeta.page} of {mailboxMeta.totalPages}
                    {" · "}
                    {mailboxMeta.total} mail
                    {mailboxMeta.total === 1 ? "" : "s"}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        setMailboxPage((current) => Math.max(1, current - 1))
                      }
                      disabled={mailboxLoading || mailboxPage <= 1}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        setMailboxPage((current) =>
                          Math.min(mailboxMeta.totalPages, current + 1),
                        )
                      }
                      disabled={
                        mailboxLoading || mailboxPage >= mailboxMeta.totalPages
                      }
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <PreviewModal
        key={previewMail?.id ?? "preview-empty"}
        mail={previewMail}
        submitting={previewSubmitting}
        decisionSubmitting={
          previewMail ? busyIds.has(previewMail.id) || rejectSubmitting : false
        }
        onSave={handleSavePreviewMail}
        onApprove={(mail) => {
          void (async () => {
            const approved = await handleApproveRequest(mail.id);
            if (approved) {
              setPreviewMail(null);
            }
          })();
        }}
        onReject={(mail, note) => void handleRejectRequest(mail.id, note)}
        onClose={() => setPreviewMail(null)}
      />
      <MailboxReplyModal
        open={mailboxComposeOpen || Boolean(replyMailboxEmail)}
        key={
          replyMailboxEmail?.id ??
          (mailboxComposeOpen
            ? "mailbox-compose-open"
            : "mailbox-compose-closed")
        }
        email={replyMailboxEmail}
        submitting={mailboxReplySubmitting}
        onClose={() => {
          setReplyMailboxEmail(null);
          setMailboxComposeOpen(false);
        }}
        onSubmit={handleSubmitMailboxReply}
      />
      <ThreadCompanyMappingModal
        open={threadCompanyModalOpen}
        currentCompanyName={selectedMailboxCompany?.name ?? ""}
        search={threadCompanySearch}
        options={threadCompanyOptions}
        showResults={
          threadCompanyResultsVisible && threadCompanySearch.trim().length >= 2
        }
        loading={threadCompanyLoading}
        saving={threadCompanySaving}
        disabled={
          !selectedMailboxThread?.latest.threadId ||
          !selectedThreadCompanyId ||
          selectedThreadCompanyId === selectedMailboxCompanyId
        }
        onClose={closeThreadCompanyModal}
        onSearchChange={(value) => {
          setThreadCompanySearch(value);
          setThreadCompanyResultsVisible(true);
          if (!value.trim()) {
            setSelectedThreadCompanyId(selectedMailboxCompanyId);
            setThreadCompanyOptions([]);
          }
        }}
        onSelectCompany={(company) => {
          setSelectedThreadCompanyId(company.id);
          setThreadCompanySearch(company.name);
          setThreadCompanyResultsVisible(false);
        }}
        onSubmit={handleSaveThreadCompanyMapping}
      />
      <TemplateEditorModal
        open={templateEditorOpen && !showInlineTemplateEditor}
        mode={templateEditorMode}
        form={templateForm}
        submitting={templateSubmitting}
        onChange={updateTemplateForm}
        onClose={() => setTemplateEditorOpen(false)}
        onSubmit={() => void handleSubmitTemplate()}
      />
      <DeleteTemplateModal
        open={templateDeleteOpen}
        template={selectedTemplate}
        submitting={templateSubmitting}
        onClose={() => setTemplateDeleteOpen(false)}
        onConfirm={() => void handleDeleteTemplate()}
      />
      <TemplateDetailsModal
        open={
          mode === "templates" &&
          templateDetailsOpen &&
          !isWideTemplateViewport &&
          !templateEditorOpen
        }
        template={selectedTemplate}
        onClose={() => setTemplateDetailsOpen(false)}
        onEdit={(template) => {
          setTemplateDetailsOpen(false);
          openEditTemplate(template);
        }}
        onDelete={() => {
          setTemplateDetailsOpen(false);
          setTemplateDeleteOpen(true);
        }}
      />
    </div>
  );
}
