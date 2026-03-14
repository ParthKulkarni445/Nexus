"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Building2,
  CalendarCheck,
  CheckCircle2,
  CheckSquare,
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
  Square,
  Trash2,
  User2,
  XCircle,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import FilterSelect from "@/components/ui/FilterSelect";
import Modal from "@/components/ui/Modal";
import RichTextEditor, {
  type RichTextEditorHandle,
} from "@/components/ui/RichTextEditor";
import SearchBar from "@/components/ui/SearchBar";
import StatusBadge from "@/components/ui/StatusBadge";

type ViewMode = "queue" | "templates" | "inbound";
type MailStatus = "pending" | "queued" | "sent" | "rejected" | "cancelled";
type MailType = "template" | "custom";
type TemplateStatus = "draft" | "approved" | "archived";
type InboundBucket = "unassigned" | "misc" | "company";

type ApiResponse<T> = {
  data?: T;
  error?: { message?: string };
};

type MailRequestRecord = {
  id: string;
  companyId?: string | null;
  requestType: MailType;
  customSubject?: string | null;
  customBody?: string | null;
  previewPayload?: {
    subject?: string;
    htmlBody?: string;
    textBody?: string;
  } | null;
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
};

type InboundEmailRecord = {
  id: string;
  subject?: string | null;
  fromEmail?: string | null;
  toEmails?: string[];
  ccEmails?: string[];
  textBody?: string | null;
  htmlBody?: string | null;
  createdAt?: string;
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
    value: "templates",
    label: "Templates",
    icon: LayoutTemplate,
    hint: "Manage reusable mail templates and approvals.",
  },
  {
    value: "inbound",
    label: "Inbound",
    icon: Inbox,
    hint: "Monitor received mail and classification buckets.",
  },
];

const QUEUE_TYPE_OPTIONS = [
  { value: "template", label: "Template" },
  { value: "custom", label: "Custom" },
];

const INBOUND_BUCKETS: Array<{ value: InboundBucket; label: string }> = [
  { value: "unassigned", label: "Unassigned" },
  { value: "company", label: "Mapped" },
  { value: "misc", label: "Misc" },
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

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
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
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.9fr)]">
      <div className="space-y-3">
        {Array.from({ length: cards }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-[#DBEAFE] bg-white p-4"
          >
            <div className="flex items-start gap-3">
              <div className="shimmer h-10 w-10 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="shimmer h-4 w-40 rounded-full" />
                <div className="shimmer h-3 w-3/4 rounded-full" />
                <div className="flex flex-wrap gap-2">
                  <div className="shimmer h-5 w-16 rounded-full" />
                  <div className="shimmer h-5 w-24 rounded-full" />
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
  onClose,
}: {
  mail: MailRequestRecord | null;
  onClose: () => void;
}) {
  if (!mail) return null;

  const subject = getMailSubject(mail);
  const html = getMailHtml(mail);
  const preview = getMailPreview(mail);

  return (
    <Modal
      isOpen={!!mail}
      onClose={onClose}
      title={`Preview - ${getMailCompanyName(mail)}`}
      size="lg"
      footer={
        <button className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Subject
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{subject}</p>
        </div>
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
      </div>
    </Modal>
  );
}

function RejectModal({
  mail,
  note,
  submitting,
  onNoteChange,
  onClose,
  onSubmit,
}: {
  mail: MailRequestRecord | null;
  note: string;
  submitting: boolean;
  onNoteChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal
      isOpen={!!mail}
      onClose={onClose}
      title="Reject Mail Request"
      size="sm"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={onSubmit}
            disabled={submitting || !note.trim()}
          >
            {submitting ? "Rejecting..." : "Reject"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          Reject request from <strong>{mail?.requester.name}</strong> for{" "}
          <strong>{mail ? getMailCompanyName(mail) : "this company"}</strong>?
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Feedback Note *
          </label>
          <textarea
            rows={4}
            className="input-base"
            placeholder="Explain why this request is being rejected..."
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}

function BulkApproveModal({
  open,
  selectedCount,
  sendAt,
  submitting,
  onSendAtChange,
  onClose,
  onConfirm,
}: {
  open: boolean;
  selectedCount: number;
  sendAt: string;
  submitting: boolean;
  onSendAtChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Bulk Approve Templates"
      size="sm"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-success"
            onClick={onConfirm}
            disabled={submitting}
          >
            <CheckCircle2 size={14} />
            {submitting ? "Approving..." : "Approve All"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          You are about to approve{" "}
          <strong>
            {selectedCount} template mail{selectedCount > 1 ? "s" : ""}
          </strong>
          .
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Schedule send (optional)
          </label>
          <input
            type="datetime-local"
            className="input-base"
            value={sendAt}
            onChange={(event) => onSendAtChange(event.target.value)}
          />
        </div>
        <div className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          <CalendarCheck size={13} className="mt-0.5 shrink-0" />
          <span>
            Bulk approval is only available for template-based requests.
          </span>
        </div>
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
  onChange: (field: keyof TemplateFormState, value: string) => void;
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
  onChange: (field: keyof TemplateFormState, value: string) => void;
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewMail, setPreviewMail] = useState<MailRequestRecord | null>(
    null,
  );
  const [rejectMail, setRejectMail] = useState<MailRequestRecord | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);
  const [bulkSendAt, setBulkSendAt] = useState("");

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

  const [inboundBucket, setInboundBucket] =
    useState<InboundBucket>("unassigned");
  const [selectedInboundId, setSelectedInboundId] = useState<string | null>(
    null,
  );

  const [mailRequests, setMailRequests] = useState<MailRequestRecord[]>([]);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [inboundEmails, setInboundEmails] = useState<InboundEmailRecord[]>([]);

  const [queueLoading, setQueueLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [inboundLoading, setInboundLoading] = useState(false);

  const [queueError, setQueueError] = useState("");
  const [templatesError, setTemplatesError] = useState("");
  const [inboundError, setInboundError] = useState("");
  const [pageMessage, setPageMessage] = useState("");

  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [templateSubmitting, setTemplateSubmitting] = useState(false);

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

  async function loadInbound(bucket: InboundBucket) {
    setInboundLoading(true);
    setInboundError("");
    try {
      const response = await requestJson<InboundEmailRecord[]>(
        `/api/v1/email/inbox?bucket=${bucket}`,
      );
      setInboundEmails(response.data ?? []);
    } catch (error) {
      setInboundError(
        error instanceof Error
          ? error.message
          : "Inbound inbox is not available right now",
      );
      setInboundEmails([]);
    } finally {
      setInboundLoading(false);
    }
  }

  useEffect(() => {
    void Promise.all([loadQueue(), loadTemplates()]);
  }, []);

  useEffect(() => {
    if (mode === "inbound") {
      void loadInbound(inboundBucket);
    }
  }, [mode, inboundBucket]);

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
      queued: mailRequests.filter((mail) => mail.status === "queued").length,
      sent: mailRequests.filter((mail) => mail.status === "sent").length,
      rejected: mailRequests.filter((mail) => mail.status === "rejected")
        .length,
    }),
    [mailRequests],
  );

  const selectableQueueIds = useMemo(
    () =>
      new Set(
        filteredQueue
          .filter(
            (mail) =>
              mail.status === "pending" && mail.requestType === "template",
          )
          .map((mail) => mail.id),
      ),
    [filteredQueue],
  );

  useEffect(() => {
    setSelectedIds((previous) => {
      const next = new Set(
        Array.from(previous).filter((id) => selectableQueueIds.has(id)),
      );
      return next.size === previous.size ? previous : next;
    });
  }, [selectableQueueIds]);

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

  const filteredInbound = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return inboundEmails;

    return inboundEmails.filter((email) =>
      [email.subject ?? "", email.fromEmail ?? "", email.company?.name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [inboundEmails, search]);

  useEffect(() => {
    if (!filteredInbound.length) {
      setSelectedInboundId(null);
      return;
    }

    if (
      !selectedInboundId ||
      !filteredInbound.some((email) => email.id === selectedInboundId)
    ) {
      setSelectedInboundId(filteredInbound[0].id);
    }
  }, [filteredInbound, selectedInboundId]);

  const selectedInbound =
    filteredInbound.find((email) => email.id === selectedInboundId) ?? null;

  function showMessage(message: string) {
    setPageMessage(message);
    window.setTimeout(() => {
      setPageMessage((current) => (current === message ? "" : current));
    }, 2600);
  }

  function toggleSelect(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((current) => {
      if (current.size === selectableQueueIds.size) return new Set();
      return new Set(selectableQueueIds);
    });
  }

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
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(requestId);
        return next;
      });
      showMessage(
        sendAt
          ? "Mail request queued for scheduled send."
          : "Mail request queued.",
      );
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Unable to approve mail request",
      );
    } finally {
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(requestId);
        return next;
      });
    }
  }

  async function handleRejectRequest() {
    if (!rejectMail || !rejectNote.trim()) return;

    setRejectSubmitting(true);
    setBusyIds((current) => new Set(current).add(rejectMail.id));
    try {
      const response = await requestJson<MailRequestRecord>(
        `/api/v1/mail/requests/${rejectMail.id}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewNote: rejectNote.trim() }),
        },
      );

      const updated = response.data;
      if (updated) {
        setMailRequests((current) =>
          current.map((mail) =>
            mail.id === rejectMail.id ? { ...mail, ...updated } : mail,
          ),
        );
      }
      setRejectMail(null);
      setRejectNote("");
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
        next.delete(rejectMail.id);
        return next;
      });
    }
  }

  async function handleBulkApprove() {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    setBulkSubmitting(true);
    try {
      await Promise.all(
        ids.map((id) => handleApproveRequest(id, bulkSendAt || undefined)),
      );
      setBulkApproveOpen(false);
      setBulkSendAt("");
      setSelectedIds(new Set());
    } finally {
      setBulkSubmitting(false);
    }
  }

  function updateTemplateForm(field: keyof TemplateFormState, value: string) {
    setTemplateForm((current) => {
      if (
        field === "name" &&
        templateEditorMode === "create" &&
        !current.slug
      ) {
        return {
          ...current,
          name: value,
          slug: slugify(value),
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

  const activeView = VIEW_OPTIONS.find((option) => option.value === mode)!;
  const showInlineTemplateEditor =
    mode === "templates" && templateEditorOpen && isWideTemplateViewport;
  const showTemplateDetailPane =
    mode === "templates" && isWideTemplateViewport && Boolean(selectedTemplate);

  return (
    <div className="-mt-6 space-y-5 px-4 pb-6 pt-0 xl:mt-0 xl:h-full xl:overflow-y-auto">
      <div className="relative z-0 pt-10">
        <div className="card relative overflow-hidden border-[#DBEAFE] bg-white px-5 py-4 sm:px-6 sm:py-5">
          <div className="relative z-10">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#2563EB]">
              Mailing Center
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Queue operations, template manager, and inbound mails in one place
            </h1>
            <p className="mt-1.5 text-sm font-bold text-[#2563EB]">
              {activeView.hint}
            </p>
          </div>
        </div>
      </div>

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
              mode === "inbound"
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
                    : "Search inbound mail by sender, company, or subject..."
              }
              className={`min-w-0 ${mode === "templates" ? "xl:min-w-[320px] xl:flex-[1.2]" : "flex-1"}`}
            />

            {mode === "inbound" && (
              <button
                type="button"
                className="btn btn-ghost btn-sm shrink-0 gap-1"
                onClick={() => void loadInbound(inboundBucket)}
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
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
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
                icon={CheckCircle2}
                label="Queued"
                value={queueStats.queued}
                active={queueStatusFilter === "queued"}
                onClick={() =>
                  setQueueStatusFilter(
                    queueStatusFilter === "queued" ? "" : "queued",
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

            {queueStatusFilter === "pending" && selectableQueueIds.size > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-2 text-sm">
                  <button
                    onClick={toggleSelectAll}
                    className="flex min-w-0 items-center gap-2 font-medium text-[#1D4ED8] transition-colors hover:text-[#1E40AF]"
                  >
                    {selectedIds.size === selectableQueueIds.size ? (
                      <CheckSquare size={15} />
                    ) : (
                      <Square size={15} className="text-slate-400" />
                    )}
                    <span>
                      {selectedIds.size === selectableQueueIds.size
                        ? "Deselect all"
                        : `Select all (${selectableQueueIds.size})`}
                    </span>
                  </button>
                  {selectedIds.size > 0 && (
                    <Badge variant="info" size="sm">
                      {selectedIds.size} selected
                    </Badge>
                  )}
                  <span className="ml-auto hidden text-xs text-slate-500 xl:inline">
                    NOTE : Bulk approve is available for template mails only.
                  </span>
                </div>
                {selectedIds.size > 0 && (
                  <button
                    className="btn btn-success btn-sm shrink-0 gap-1"
                    onClick={() => setBulkApproveOpen(true)}
                  >
                    <CheckCircle2 size={14} />
                    Approve Selected ({selectedIds.size})
                  </button>
                )}
              </div>
            )}

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
                  const isBusy = busyIds.has(mail.id);
                  const isSelectable =
                    mail.status === "pending" &&
                    mail.requestType === "template";
                  const isSelected = selectedIds.has(mail.id);

                  return (
                    <div
                      key={mail.id}
                      className={`rounded-2xl border p-4 transition-all ${
                        isSelected
                          ? "border-[#BFDBFE] bg-[#EFF6FF]/40"
                          : "border-[#DBEAFE] bg-white hover:border-[#BFDBFE]"
                      }`}
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
                        <div className="flex min-w-0 flex-1 gap-3">
                          <div className="mt-1 shrink-0">
                            {isSelectable ? (
                              <button
                                onClick={() => toggleSelect(mail.id)}
                                className="text-slate-400 transition-colors hover:text-[#2563EB]"
                              >
                                {isSelected ? (
                                  <CheckSquare
                                    size={16}
                                    className="text-[#2563EB]"
                                  />
                                ) : (
                                  <Square size={16} />
                                )}
                              </button>
                            ) : (
                              <div className="h-4 w-4" />
                            )}
                          </div>

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
                            className="btn btn-ghost btn-sm gap-1 text-slate-500 hover:text-[#2563EB]"
                            onClick={() => setPreviewMail(mail)}
                          >
                            <Eye size={14} />
                            View
                          </button>
                          {mail.status === "pending" && (
                            <>
                              <button
                                className="btn btn-success btn-sm gap-1"
                                onClick={() =>
                                  void handleApproveRequest(mail.id)
                                }
                                disabled={isBusy}
                              >
                                <CheckCircle2 size={13} />
                                {isBusy ? "Working..." : "Approve"}
                              </button>
                              <button
                                className="btn btn-danger btn-sm gap-1"
                                onClick={() => {
                                  setRejectMail(mail);
                                  setRejectNote(mail.reviewNote ?? "");
                                }}
                                disabled={isBusy}
                              >
                                <XCircle size={13} />
                                Reject
                              </button>
                            </>
                          )}
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

      {mode === "inbound" && (
        <div className="card overflow-hidden">
          <div className="space-y-4 p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {INBOUND_BUCKETS.map((bucket) => (
                  <button
                    key={bucket.value}
                    type="button"
                    onClick={() => setInboundBucket(bucket.value)}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                      bucket.value === inboundBucket
                        ? "bg-[#2563EB] text-white"
                        : "bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE]"
                    }`}
                  >
                    {bucket.label}
                  </button>
                ))}
              </div>
              <p className="text-sm text-slate-500">
                Classified against{" "}
                <strong className="text-slate-700">{inboundBucket}</strong>{" "}
                bucket
              </p>
            </div>

            {inboundLoading ? (
              <SectionSkeleton />
            ) : inboundError ? (
              <EmptyState
                icon={Inbox}
                title="Inbound inbox is not available yet"
                description={inboundError}
                action={
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => void loadInbound(inboundBucket)}
                  >
                    Retry
                  </button>
                }
              />
            ) : filteredInbound.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No inbound emails in this bucket"
                description="Once the inbox API is ready, received mails will appear here."
              />
            ) : (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.9fr)]">
                <div className="space-y-3">
                  {filteredInbound.map((email) => {
                    const selected = email.id === selectedInboundId;
                    return (
                      <button
                        key={email.id}
                        type="button"
                        onClick={() => setSelectedInboundId(email.id)}
                        className={`w-full rounded-2xl border p-4 text-left transition-all ${
                          selected
                            ? "border-[#2563EB] bg-[#EFF6FF]"
                            : "border-[#DBEAFE] bg-white hover:border-[#BFDBFE]"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                            <Mail size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-semibold text-slate-900">
                                {email.subject || "No subject"}
                              </p>
                              {email.company?.name && (
                                <Badge variant="info" size="sm">
                                  {email.company.name}
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                              From {email.fromEmail || "Unknown sender"}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span>{formatDateTime(email.createdAt)}</span>
                              {email.attachments &&
                                email.attachments.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Paperclip size={11} />
                                    {email.attachments.length} attachment
                                    {email.attachments.length > 1 ? "s" : ""}
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedInbound && (
                  <div className="rounded-2xl border border-[#DBEAFE] bg-white p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {selectedInbound.subject || "No subject"}
                      </h3>
                      <Badge variant="info" size="sm">
                        {inboundBucket}
                      </Badge>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          From
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {selectedInbound.fromEmail || "-"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Received
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {formatDateTime(selectedInbound.createdAt)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Company Match
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-sm font-medium text-slate-800">
                          <Building2 size={13} />
                          {selectedInbound.company?.name ?? "Not mapped"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Thread
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {selectedInbound.threadId ?? "Standalone message"}
                        </p>
                      </div>
                    </div>

                    {(selectedInbound.toEmails?.length ||
                      selectedInbound.ccEmails?.length) && (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        {selectedInbound.toEmails &&
                          selectedInbound.toEmails.length > 0 && (
                            <p>
                              <strong>To:</strong>{" "}
                              {selectedInbound.toEmails.join(", ")}
                            </p>
                          )}
                        {selectedInbound.ccEmails &&
                          selectedInbound.ccEmails.length > 0 && (
                            <p className="mt-1">
                              <strong>CC:</strong>{" "}
                              {selectedInbound.ccEmails.join(", ")}
                            </p>
                          )}
                      </div>
                    )}

                    {selectedInbound.attachments &&
                      selectedInbound.attachments.length > 0 && (
                        <div className="mt-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Attachments
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {selectedInbound.attachments.map((attachment) => (
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

                    {selectedInbound.classification && (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Classification
                        </p>
                        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-600">
                          {JSON.stringify(
                            selectedInbound.classification,
                            null,
                            2,
                          )}
                        </pre>
                      </div>
                    )}

                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
                        Message body
                      </div>
                      {selectedInbound.htmlBody ? (
                        <div
                          className="prose prose-sm max-w-none p-4"
                          dangerouslySetInnerHTML={{
                            __html: selectedInbound.htmlBody,
                          }}
                        />
                      ) : (
                        <div className="whitespace-pre-wrap p-4 text-sm leading-relaxed text-slate-700">
                          {selectedInbound.textBody ||
                            "No body content available."}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <PreviewModal mail={previewMail} onClose={() => setPreviewMail(null)} />
      <RejectModal
        mail={rejectMail}
        note={rejectNote}
        submitting={rejectSubmitting}
        onNoteChange={setRejectNote}
        onClose={() => {
          setRejectMail(null);
          setRejectNote("");
        }}
        onSubmit={() => void handleRejectRequest()}
      />
      <BulkApproveModal
        open={bulkApproveOpen}
        selectedCount={selectedIds.size}
        sendAt={bulkSendAt}
        submitting={bulkSubmitting}
        onSendAtChange={setBulkSendAt}
        onClose={() => {
          setBulkApproveOpen(false);
          setBulkSendAt("");
        }}
        onConfirm={() => void handleBulkApprove()}
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
