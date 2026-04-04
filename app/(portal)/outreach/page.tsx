"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  PhoneCall,
  Send,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import FilterSelect from "@/components/ui/FilterSelect";
import MailAttachmentInput, {
  type MailAttachmentMeta,
} from "@/components/ui/MailAttachmentInput";
import Modal from "@/components/ui/Modal";
import SearchBar from "@/components/ui/SearchBar";
import {
  PREDEFINED_TEMPLATE_VARIABLES,
  resolveTemplateVariableValue,
} from "@/lib/mailing/templateVariables";
import OutreachLoadingView from "./OutreachLoadingView";

type OutreachStatus =
  | "not_contacted"
  | "contacted"
  | "positive"
  | "accepted"
  | "rejected";

type Contact = {
  id: string;
  name: string;
  designation: string;
  phones: string[];
  emails: string[];
  linkedin: string;
};

type ReplyContext = {
  threadId?: string;
  messageId: string;
  references: string[];
  subject: string;
  recipientEmail: string;
};

type SeasonTask = {
  companySeasonCycleId: string;
  seasonId: string;
  season: string;
  seasonType: "intern" | "placement";
  status: OutreachStatus;
  lastContacted: string | null;
  nextFollowUp: string | null;
};

type OutreachInteraction = {
  id: string;
  action: "call" | "email" | "note";
  summary: string;
  outcome: string | null;
  contactId: string | null;
  contactName: string | null;
  companySeasonCycleId: string | null;
  season: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  createdBy: string;
};

type OutreachCompany = {
  id: string;
  companyId: string;
  companyName: string;
  industry: string;
  contacts: Contact[];
  interactions: OutreachInteraction[];
  seasons: SeasonTask[];
};

type OutreachResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    mailingDefaults?: {
      spocName?: string;
      spocContact?: string;
      spocMail?: string;
    };
  };
  entries: OutreachCompany[];
};

type MailTemplate = {
  id: string;
  name: string;
  subject: string;
  status: string;
  bodyHtml?: string | null;
  bodyText?: string | null;
  variables: string[];
  attachments?: MailAttachmentMeta[];
};

type ApiResponse<T> = {
  data?: T;
  error?: { message?: string };
};

const STATUS_OPTIONS = [
  { value: "not_contacted", label: "Not Contacted" },
  { value: "contacted", label: "Contacted" },
  { value: "positive", label: "Positive" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_STYLE: Record<
  OutreachStatus,
  { bg: string; border: string; text: string; label: string }
> = {
  not_contacted: {
    bg: "bg-slate-100",
    border: "border-slate-200",
    text: "text-slate-500",
    label: "Not Contacted",
  },
  contacted: {
    bg: "bg-[#EFF6FF]",
    border: "border-[#BFDBFE]",
    text: "text-[#1D4ED8]",
    label: "Contacted",
  },
  positive: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
    label: "Positive",
  },
  accepted: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    label: "Accepted",
  },
  rejected: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-600",
    label: "Rejected",
  },
};

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { credentials: "include", ...init });
  const text = await response.text();
  let body: ApiResponse<T> = {};
  if (text) {
    try {
      body = JSON.parse(text) as ApiResponse<T>;
    } catch {}
  }
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error(body.error?.message ?? "Request failed");
  }
  return body;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function latestContacted(seasons: SeasonTask[]) {
  return seasons.reduce<string | null>((latest, season) => {
    if (!season.lastContacted) return latest;
    if (!latest) return season.lastContacted;
    return new Date(season.lastContacted) > new Date(latest)
      ? season.lastContacted
      : latest;
  }, null);
}

function nearestFollowUp(seasons: SeasonTask[]) {
  return seasons.reduce<string | null>((nearest, season) => {
    if (!season.nextFollowUp) return nearest;
    if (!nearest) return season.nextFollowUp;
    return new Date(season.nextFollowUp) < new Date(nearest)
      ? season.nextFollowUp
      : nearest;
  }, null);
}

function getInteractionMeta(action: OutreachInteraction["action"]) {
  if (action === "call") {
    return {
      label: "Call",
      icon: Phone,
      badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    };
  }

  if (action === "email") {
    return {
      label: "Mail",
      icon: Mail,
      badgeClass: "bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]",
    };
  }

  return {
    label: "Note",
    icon: MessageSquare,
    badgeClass: "bg-amber-50 text-amber-700 border border-amber-200",
  };
}

function ContactSelect({
  contacts,
  value,
  onChange,
  placeholder,
}: {
  contacts: Contact[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <select
      className="input-base"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{placeholder}</option>
      {contacts.map((contact) => (
        <option key={contact.id} value={contact.id}>
          {contact.name} - {contact.designation}
        </option>
      ))}
    </select>
  );
}

function SeasonSelect({
  seasons,
  value,
  onChange,
}: {
  seasons: SeasonTask[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      className="input-base"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Select season</option>
      {seasons.map((season) => (
        <option
          key={season.companySeasonCycleId}
          value={season.companySeasonCycleId}
        >
          {season.season} ({season.seasonType})
        </option>
      ))}
    </select>
  );
}

function interpolateTemplate(
  value: string | null | undefined,
  variables: Record<string, string>,
) {
  if (!value) return "";
  return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    return variables[key] ?? `{{${key}}}`;
  });
}

function prettifyVariableLabel(variable: string) {
  const predefined = PREDEFINED_TEMPLATE_VARIABLES.find(
    (item) => item.key === variable,
  );

  if (predefined) {
    return predefined.label;
  }

  return variable
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function ActionModals({
  entry,
  templates,
  currentUser,
  mailSubmitting,
  logSubmitting,
  statusSubmitting,
  mailError,
  logError,
  statusError,
  onQueueMail,
  onLog,
  onUpdateStatus,
  replyContext,
  onReplyContextConsumed,
}: {
  entry: OutreachCompany;
  templates: MailTemplate[];
  currentUser: OutreachResponse["user"];
  mailSubmitting: boolean;
  logSubmitting: boolean;
  statusSubmitting: boolean;
  mailError: string | null;
  logError: string | null;
  statusError: string | null;
  onQueueMail: (payload: {
    companyId: string;
    companySeasonCycleId: string;
    contactId: string;
    requestType: "template" | "custom";
    templateId?: string;
    templateVariables?: Record<string, string>;
    previewPayload?: Record<string, unknown>;
    customSubject?: string;
    customBody?: string;
    attachments?: MailAttachmentMeta[];
    replyContext?: ReplyContext;
  }) => Promise<void>;
  onLog: (payload: {
    companyId: string;
    companySeasonCycleId: string;
    action: "call" | "email" | "note";
    contactId?: string;
    summary: string;
    outcome?: string;
    nextFollowUpAt?: string;
  }) => Promise<void>;
  onUpdateStatus: (payload: {
    companySeasonCycleId: string;
    status: OutreachStatus;
    note?: string;
  }) => Promise<void>;
  replyContext: ReplyContext | null;
  onReplyContextConsumed: () => void;
}) {
  const [mode, setMode] = useState<"none" | "mail" | "log" | "call" | "status">(
    "none",
  );
  const [cycleId, setCycleId] = useState("");
  const [contactId, setContactId] = useState("");
  const [requestType, setRequestType] = useState<"template" | "custom">(
    "template",
  );
  const [templateId, setTemplateId] = useState("");
  const [templateVariables, setTemplateVariables] = useState<
    Record<string, string>
  >({});
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [attachments, setAttachments] = useState<MailAttachmentMeta[]>([]);
  const [action, setAction] = useState<"call" | "email" | "note">("call");
  const [summary, setSummary] = useState("");
  const [outcome, setOutcome] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [statusValue, setStatusValue] =
    useState<OutreachStatus>("not_contacted");
  const [statusNote, setStatusNote] = useState("");
  const selectedTemplate = templates.find(
    (template) => template.id === templateId,
  );
  const selectedContact = entry.contacts.find(
    (contact) => contact.id === contactId,
  );
  const replyContact = useMemo(() => {
    if (!replyContext) return null;

    const normalizedRecipient = replyContext.recipientEmail.toLowerCase();
    return (
      entry.contacts.find((contact) =>
        contact.emails.some(
          (email) => email.trim().toLowerCase() === normalizedRecipient,
        ),
      ) ?? null
    );
  }, [entry.contacts, replyContext]);
  const resolvedCycleId =
    cycleId ||
    (entry.seasons.length === 1 ? entry.seasons[0].companySeasonCycleId : "");
  const effectiveReplyContext = replyContext;
  const effectiveContactId = contactId || replyContact?.id || "";
  const effectiveCycleId = resolvedCycleId;
  const effectiveRequestType = effectiveReplyContext ? "custom" : requestType;
  const effectiveCustomSubject =
    effectiveReplyContext && !customSubject
      ? effectiveReplyContext.subject
      : customSubject;
  const autoTemplateValues = useMemo(
    () => ({
      companyName: entry.companyName,
      hrName:
        entry.contacts.find((contact) => contact.id === effectiveContactId)
          ?.name ?? "",
      spocName: currentUser.mailingDefaults?.spocName ?? currentUser.name,
      spocContact: currentUser.mailingDefaults?.spocContact ?? "",
      spocMail: currentUser.mailingDefaults?.spocMail ?? "",
    }),
    [
      currentUser.mailingDefaults?.spocContact,
      currentUser.mailingDefaults?.spocMail,
      currentUser.mailingDefaults?.spocName,
      currentUser.name,
      entry.companyName,
      effectiveContactId,
      entry.contacts,
    ],
  );
  const templateVariableDrafts = useMemo(
    () =>
      (selectedTemplate?.variables ?? []).map((variable) => {
        const resolved = resolveTemplateVariableValue(variable, autoTemplateValues);
        const currentValue = templateVariables[variable] ?? resolved.autoValue;

        return {
          key: variable,
          label: resolved.predefined?.label ?? prettifyVariableLabel(variable),
          value: currentValue,
          autoFilled: resolved.autoFilled,
          description:
            resolved.predefined?.description ??
            "Enter a custom value for this template variable.",
        };
      }),
    [autoTemplateValues, selectedTemplate?.variables, templateVariables],
  );
  const resolvedTemplateVariables = useMemo(
    () =>
      Object.fromEntries(
        templateVariableDrafts.map((variable) => [variable.key, variable.value]),
      ),
    [templateVariableDrafts],
  );

  const missingVariables = (selectedTemplate?.variables ?? []).filter(
    (variable) => !resolvedTemplateVariables[variable]?.trim(),
  );
  function closeModal() {
    setMode("none");
    setCycleId("");
    setContactId("");
    setRequestType("template");
    setTemplateId("");
    setTemplateVariables({});
    setCustomSubject("");
    setCustomBody("");
    setAttachments([]);
    setAction("call");
    setSummary("");
    setOutcome("");
    setNextFollowUpAt("");
    setStatusValue("not_contacted");
    setStatusNote("");
    onReplyContextConsumed();
  }

  function openStatusEditor(season: SeasonTask) {
    setCycleId(season.companySeasonCycleId);
    setStatusValue(season.status);
    setStatusNote("");
    setMode("status");
  }

  return (
    <>
      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Season Status
        </p>
        {entry.seasons.map((season) => {
          const status = STATUS_STYLE[season.status];
          return (
            <div
              key={season.companySeasonCycleId}
              className="flex flex-wrap items-center gap-2"
            >
              <div className="min-w-34 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium leading-tight text-slate-700 wrap-break-word">
                {season.season}
              </div>
              <div
                className={`min-w-30 flex-1 rounded-lg border px-3 py-2 text-center text-xs font-semibold ${status.bg} ${status.border} ${status.text}`}
              >
                {status.label}
              </div>
              <button
                className="btn btn-secondary btn-sm ml-auto shrink-0 px-2 text-slate-500"
                onClick={() => openStatusEditor(season)}
              >
                <Pencil size={13} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          onClick={() => setMode("log")}
          className="btn btn-secondary btn-sm gap-1"
        >
          <MessageSquare size={13} />
          Log
        </button>
        <button
          onClick={() => setMode("call")}
          className="btn btn-primary btn-sm gap-1"
        >
          <Phone size={13} />
          Call
        </button>
        <button
          onClick={() => setMode("mail")}
          className="btn btn-primary btn-sm gap-1"
        >
          <Mail size={13} />
          Mail
        </button>
      </div>

      <Modal
        isOpen={mode === "mail" || Boolean(effectiveReplyContext)}
        onClose={closeModal}
        title={`${effectiveReplyContext ? "Reply in Thread" : "Send Mail"} - ${entry.companyName}`}
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={
                mailSubmitting ||
                !effectiveCycleId ||
                !effectiveContactId ||
                (effectiveRequestType === "template"
                  ? !templateId || missingVariables.length > 0
                  : !effectiveCustomSubject || !customBody)
              }
              onClick={() => {
                const mergedAttachments = [
                  ...(effectiveRequestType === "template"
                    ? (selectedTemplate?.attachments ?? [])
                    : []),
                  ...attachments,
                ].filter(
                  (attachment, index, current) =>
                    current.findIndex(
                      (candidate) =>
                        candidate.storagePath === attachment.storagePath,
                    ) === index,
                );
                void onQueueMail({
                  companyId: entry.companyId,
                  companySeasonCycleId: effectiveCycleId,
                  contactId: effectiveContactId,
                  requestType: effectiveRequestType,
                  templateId,
                  templateVariables:
                    effectiveRequestType === "template"
                      ? resolvedTemplateVariables
                      : undefined,
                  previewPayload:
                    effectiveRequestType === "template" && selectedTemplate
                      ? {
                          templateVariables: resolvedTemplateVariables,
                          subject: interpolateTemplate(
                            selectedTemplate.subject,
                            resolvedTemplateVariables,
                          ),
                          htmlBody: interpolateTemplate(
                            selectedTemplate.bodyHtml,
                            resolvedTemplateVariables,
                          ),
                          textBody: interpolateTemplate(
                            selectedTemplate.bodyText ??
                              selectedTemplate.bodyHtml ??
                              "",
                            resolvedTemplateVariables,
                          ),
                          attachments: mergedAttachments,
                        }
                      : undefined,
                  customSubject: effectiveCustomSubject,
                  customBody,
                  attachments: mergedAttachments,
                  replyContext: effectiveReplyContext ?? undefined,
                }).then(closeModal);
              }}
            >
              <Send size={14} />
              {mailSubmitting
                ? "Queueing..."
                : effectiveReplyContext
                  ? "Queue Reply"
                  : "Send to Queue"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {mailError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {mailError}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Season *
            </label>
            <SeasonSelect
              seasons={entry.seasons}
              value={resolvedCycleId}
              onChange={setCycleId}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Send to Contact *
            </label>
            <ContactSelect
              contacts={entry.contacts}
              value={effectiveContactId}
              onChange={setContactId}
              placeholder="Select a contact"
            />
          </div>
          {effectiveReplyContext ? (
            <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2.5 text-xs text-[#1D4ED8]">
              Reply will stay in the existing thread with{" "}
              <span className="font-semibold">
                {effectiveReplyContext.recipientEmail}
              </span>
              {replyContact ? "" : ". Select the matching contact before queueing."}
            </div>
          ) : null}
          {effectiveReplyContext ? null : (
            <div className="flex gap-3">
              {(["template", "custom"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setRequestType(type)}
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium ${requestType === type ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]" : "border-slate-200 bg-white text-slate-600"}`}
                >
                  {type === "template" ? "Template" : "Custom"}
                </button>
              ))}
            </div>
          )}
          {effectiveRequestType === "template" ? (
            <div className="space-y-4">
              <select
                className="input-base"
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
              >
                <option value="">Select a template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.status})
                  </option>
                ))}
              </select>
              {selectedTemplate?.variables.length ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {templateVariableDrafts.map((variable) => (
                      <div key={variable.key} className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {variable.label}
                        </label>
                        <input
                          className="input-base"
                          value={variable.value}
                          onChange={(event) =>
                            setTemplateVariables((current) => ({
                              ...current,
                              [variable.key]: event.target.value,
                            }))
                          }
                          placeholder={`Enter ${variable.label}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <input
                className="input-base"
                value={effectiveCustomSubject}
                onChange={(event) => setCustomSubject(event.target.value)}
                placeholder="Email subject"
              />
              <textarea
                rows={5}
                className="input-base"
                value={customBody}
                onChange={(event) => setCustomBody(event.target.value)}
                placeholder="Write the email content"
              />
            </div>
          )}
          <MailAttachmentInput
            value={attachments}
            onChange={setAttachments}
            disabled={mailSubmitting}
            maxFiles={6}
          />
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>
              Mail requests are queued for approval before dispatch. Coordinators
              log in with personal accounts, while final sending uses the shared
              TPO mailbox when it is configured.
            </span>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={mode === "log"}
        onClose={closeModal}
        title={`Log Interaction - ${entry.companyName}`}
        size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={logSubmitting || !resolvedCycleId || !summary.trim()}
              onClick={() => {
                void onLog({
                  companyId: entry.companyId,
                  companySeasonCycleId: resolvedCycleId,
                  action,
                  contactId: contactId || undefined,
                  summary,
                  outcome: outcome || undefined,
                  nextFollowUpAt: nextFollowUpAt
                    ? new Date(`${nextFollowUpAt}T09:00:00`).toISOString()
                    : undefined,
                }).then(closeModal);
              }}
            >
              {logSubmitting ? "Saving..." : "Log"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {logError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {logError}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Season *
            </label>
            <SeasonSelect
              seasons={entry.seasons}
              value={resolvedCycleId}
              onChange={setCycleId}
            />
          </div>
          <div className="flex gap-2">
            {(["call", "email", "note"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setAction(item)}
                className={`flex-1 rounded-lg border py-2 text-xs font-medium capitalize ${action === item ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]" : "border-slate-200 text-slate-600"}`}
              >
                {item}
              </button>
            ))}
          </div>
          <ContactSelect
            contacts={entry.contacts}
            value={contactId}
            onChange={setContactId}
            placeholder="Company-wide note (optional)"
          />
          <textarea
            rows={3}
            className="input-base"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="What happened in this interaction?"
          />
          <input
            className="input-base"
            value={outcome}
            onChange={(event) => setOutcome(event.target.value)}
            placeholder="Interested, callback requested, no response..."
          />
          <input
            type="date"
            className="input-base"
            value={nextFollowUpAt}
            onChange={(event) => setNextFollowUpAt(event.target.value)}
          />
        </div>
      </Modal>

      <Modal
        isOpen={mode === "call"}
        onClose={closeModal}
        title={`Call - ${entry.companyName}`}
        size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <a
              href={
                selectedContact?.phones[0]
                  ? `tel:${selectedContact.phones[0]}`
                  : undefined
              }
              className={`btn btn-primary ${!selectedContact?.phones[0] ? "pointer-events-none opacity-45" : ""}`}
            >
              <Phone size={14} />
              Call Now
            </a>
          </>
        }
      >
        <div className="space-y-4">
          <ContactSelect
            contacts={entry.contacts}
            value={contactId}
            onChange={setContactId}
            placeholder="Select a contact to call"
          />
          {selectedContact ? (
            <div className="rounded-lg border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-3 space-y-1">
              <p className="text-sm font-semibold text-slate-800">
                {selectedContact.name}
              </p>
              <p className="text-xs text-slate-500">
                {selectedContact.designation}
              </p>
              {selectedContact.phones.map((phone) => (
                <a
                  key={phone}
                  href={`tel:${phone}`}
                  className="flex items-center gap-2 text-sm font-medium text-[#1D4ED8] hover:underline"
                >
                  <Phone size={13} />
                  {phone}
                </a>
              ))}
            </div>
          ) : (
            <p className="py-2 text-center text-xs text-slate-400">
              Select a contact to see phone numbers.
            </p>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={mode === "status"}
        onClose={closeModal}
        title={`Update Status - ${entry.companyName}`}
        size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={statusSubmitting || !cycleId}
              onClick={() => {
                void onUpdateStatus({
                  companySeasonCycleId: cycleId,
                  status: statusValue,
                  note: statusNote.trim() || undefined,
                }).then(closeModal);
              }}
            >
              {statusSubmitting ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {statusError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {statusError}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Season
            </label>
            <SeasonSelect
              seasons={entry.seasons}
              value={resolvedCycleId}
              onChange={setCycleId}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              className="input-base"
              value={statusValue}
              onChange={(event) =>
                setStatusValue(event.target.value as OutreachStatus)
              }
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Note
            </label>
            <textarea
              rows={3}
              className="input-base"
              value={statusNote}
              onChange={(event) => setStatusNote(event.target.value)}
              placeholder="Optional context for this status change"
            />
          </div>
        </div>
      </Modal>
    </>
  );
}

export default function OutreachPage() {
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<OutreachCompany[]>([]);
  const [templates, setTemplates] = useState<MailTemplate[]>([]);
  const [currentUserName, setCurrentUserName] = useState("Coordinator");
  const [currentUser, setCurrentUser] = useState<OutreachResponse["user"]>({
    id: "",
    name: "Coordinator",
    email: "",
    mailingDefaults: {},
  });
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [seasonFilter, setSeasonFilter] = useState<string[]>([]);
  const [mailSubmitting, setMailSubmitting] = useState(false);
  const [logSubmitting, setLogSubmitting] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [mailError, setMailError] = useState<string | null>(null);
  const [logError, setLogError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null,
  );
  const [pendingReplyContext, setPendingReplyContext] =
    useState<ReplyContext | null>(null);
  const detailsCardRef = useRef<HTMLDivElement | null>(null);
  const detailLeftColumnRef = useRef<HTMLDivElement | null>(null);
  const [taskListHeight, setTaskListHeight] = useState<number | null>(null);
  const [detailColumnsHeight, setDetailColumnsHeight] = useState<number | null>(
    null,
  );

  const loadOutreach = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const [outreachRes, templatesRes] = await Promise.all([
        requestJson<OutreachResponse>("/api/v1/outreach"),
        requestJson<MailTemplate[]>("/api/v1/mail/templates").catch(() => ({
          data: [],
        })),
      ]);
      setEntries(outreachRes.data?.entries ?? []);
      setCurrentUser(
        outreachRes.data?.user ?? {
          id: "",
          name: "Coordinator",
          email: "",
          mailingDefaults: {},
        },
      );
      setCurrentUserName(outreachRes.data?.user.name ?? "Coordinator");
      setTemplates(
        (templatesRes.data ?? []).filter(
          (template) => template.status !== "archived",
        ),
      );
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to load outreach queue",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOutreach();
  }, [loadOutreach]);

  useEffect(() => {
    const companyId = searchParams.get("companyId");
    const messageId = searchParams.get("replyMessageId");
    const recipientEmail = searchParams.get("replyRecipientEmail");

    if (companyId) {
      setSelectedCompanyId(companyId);
    }

    if (!messageId || !recipientEmail) {
      return;
    }

    const referencesValue = searchParams.get("replyReferences") ?? "";
    setPendingReplyContext({
      threadId: searchParams.get("replyThreadId") ?? undefined,
      messageId,
      references: referencesValue
        .split("||")
        .map((value) => value.trim())
        .filter(Boolean),
      subject: searchParams.get("replySubject") ?? "",
      recipientEmail,
    });
  }, [searchParams]);

  const seasonOptions = useMemo(
    () =>
      Array.from(
        new Map(
          entries.flatMap((entry) =>
            entry.seasons.map((season) => [
              season.seasonId,
              { value: season.season, label: season.season },
            ]),
          ),
        ).values(),
      ),
    [entries],
  );

  const filtered = useMemo(() => {
    let data = entries;
    if (search) {
      const query = search.toLowerCase();
      data = data.filter(
        (entry) =>
          entry.companyName.toLowerCase().includes(query) ||
          entry.industry.toLowerCase().includes(query) ||
          entry.contacts.some((contact) =>
            contact.name.toLowerCase().includes(query),
          ),
      );
    }
    if (statusFilter.length > 0) {
      data = data.filter((entry) =>
        entry.seasons.some((season) => statusFilter.includes(season.status)),
      );
    }
    if (seasonFilter.length > 0) {
      data = data.filter((entry) =>
        entry.seasons.some((season) => seasonFilter.includes(season.season)),
      );
    }
    return data;
  }, [entries, search, seasonFilter, statusFilter]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedCompanyId(null);
      return;
    }

    setSelectedCompanyId((current) => {
      if (current && filtered.some((entry) => entry.companyId === current)) {
        return current;
      }
      return filtered[0].companyId;
    });
  }, [filtered]);

  const selectedEntry = useMemo(
    () =>
      filtered.find((entry) => entry.companyId === selectedCompanyId) ?? null,
    [filtered, selectedCompanyId],
  );

  useEffect(() => {
    const element = detailsCardRef.current;
    if (!element) {
      setTaskListHeight(null);
      return;
    }

    const updateHeight = () => {
      setTaskListHeight(element.getBoundingClientRect().height);
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [selectedEntry]);

  useEffect(() => {
    const element = detailLeftColumnRef.current;
    if (!element) {
      setDetailColumnsHeight(null);
      return;
    }

    const updateHeight = () => {
      setDetailColumnsHeight(element.getBoundingClientRect().height);
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [selectedEntry]);

  const followUpsDue = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return entries.filter((entry) => {
      const next = nearestFollowUp(entry.seasons);
      if (!next) return false;
      const date = new Date(next);
      date.setHours(0, 0, 0, 0);
      return date <= today;
    }).length;
  }, [entries]);

  const stats = useMemo(
    () => ({
      assigned: entries.length,
      contacted: entries.filter((entry) => latestContacted(entry.seasons))
        .length,
      pending: entries.filter((entry) =>
        entry.seasons.some((season) => season.status === "not_contacted"),
      ).length,
      followUpsDue,
    }),
    [entries, followUpsDue],
  );

  const handleQueueMail = async (payload: {
    companyId: string;
    companySeasonCycleId: string;
    contactId: string;
    requestType: "template" | "custom";
    templateId?: string;
    templateVariables?: Record<string, string>;
    previewPayload?: Record<string, unknown>;
    customSubject?: string;
    customBody?: string;
    attachments?: MailAttachmentMeta[];
    replyContext?: ReplyContext;
  }) => {
    setMailError(null);
    setMailSubmitting(true);
    try {
      const entry = entries.find(
        (item) => item.companyId === payload.companyId,
      );
      const contact = entry?.contacts.find(
        (item) => item.id === payload.contactId,
      );
      if (!contact) throw new Error("Please select a contact");
      await requestJson("/api/v1/mail/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: payload.companyId,
          companySeasonCycleId: payload.companySeasonCycleId,
          requestType: payload.requestType,
          templateId:
            payload.requestType === "template" ? payload.templateId : undefined,
          previewPayload:
            payload.requestType === "template"
              ? payload.previewPayload
              : undefined,
          customSubject:
            payload.requestType === "custom"
              ? payload.customSubject
              : undefined,
          customBody:
            payload.requestType === "custom" ? payload.customBody : undefined,
          attachments: payload.attachments,
          recipientFilter: {
            contactIds: [contact.id],
            emails: contact.emails,
            replyContext: payload.replyContext,
            templateVariables:
              payload.requestType === "template"
                ? payload.templateVariables
                : undefined,
          },
        }),
      });
    } catch (error) {
      setMailError(
        error instanceof Error ? error.message : "Unable to queue mail request",
      );
      throw error;
    } finally {
      setMailSubmitting(false);
    }
  };

  const handleLog = async (payload: {
    companyId: string;
    companySeasonCycleId: string;
    action: "call" | "email" | "note";
    contactId?: string;
    summary: string;
    outcome?: string;
    nextFollowUpAt?: string;
  }) => {
    setLogError(null);
    setLogSubmitting(true);
    try {
      await requestJson("/api/v1/outreach/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await loadOutreach();
    } catch (error) {
      setLogError(
        error instanceof Error ? error.message : "Unable to log interaction",
      );
      throw error;
    } finally {
      setLogSubmitting(false);
    }
  };

  const handleStatusUpdate = async (payload: {
    companySeasonCycleId: string;
    status: OutreachStatus;
    note?: string;
  }) => {
    setStatusError(null);
    setStatusSubmitting(true);
    try {
      await requestJson(
        `/api/v1/company-season-cycles/${payload.companySeasonCycleId}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: payload.status,
            note: payload.note,
          }),
        },
      );
      await loadOutreach();
    } catch (error) {
      setStatusError(
        error instanceof Error ? error.message : "Unable to update status",
      );
      throw error;
    } finally {
      setStatusSubmitting(false);
    }
  };

  if (loading) {
    return <OutreachLoadingView />;
  }

  return (
    <div className="-mt-6 xl:mt-0 space-y-5 px-4 pb-6 animate-fade-in xl:h-full xl:overflow-y-auto hide-scrollbar">
      <div className="relative z-0 pt-10">
        <div
          className="card relative overflow-hidden px-5 py-4 sm:px-6 sm:py-5"
          style={{ background: "#FFFFFF", borderColor: "#DBEAFE" }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#2563EB]">
            Personal Outreach Desk
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Hello {currentUserName}, check the tasks lined up for you.
          </h1>
          <p className="mt-1.5 text-sm font-bold text-[#2563EB]">
            This page shows your assigned companies once, with all active
            seasons you own under each card.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { title: "Companies", value: stats.assigned, icon: Building2 },
              { title: "Contacted", value: stats.contacted, icon: PhoneCall },
              { title: "Pending", value: stats.pending, icon: Clock },
              {
                title: "Follow-ups Due",
                value: stats.followUpsDue,
                icon: CheckCircle2,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-[#3B82F6] bg-[#3B82F6] px-3 py-2.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-black">
                      {item.title}
                    </p>
                    <p className="mt-1 text-2xl font-bold leading-none text-white">
                      {item.value}
                    </p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DBEAFE] bg-white">
                    <item.icon size={20} color="#2563EB" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="border-b border-(--card-border) px-4 py-3">
          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search by company, industry, or contact..."
              className="flex-1 min-w-0"
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:shrink-0">
              <FilterSelect
                multiple
                value={statusFilter}
                onChange={setStatusFilter}
                options={STATUS_OPTIONS}
                placeholder="Status"
                className="w-full sm:w-40 md:w-44"
              />
              <FilterSelect
                multiple
                value={seasonFilter}
                onChange={setSeasonFilter}
                options={seasonOptions}
                placeholder="Season"
                className="w-full sm:w-44 md:w-52"
              />
            </div>
            {statusFilter.length + seasonFilter.length > 0 && (
              <button
                className="btn btn-ghost btn-sm shrink-0 text-slate-500 hover:text-slate-700"
                onClick={() => {
                  setStatusFilter([]);
                  setSeasonFilter([]);
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card p-4">
        {pageError ? (
          <EmptyState
            icon={Building2}
            title="Unable to load outreach queue"
            description={pageError}
          />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No companies assigned yet"
            description="Once assignments are made to you, they will appear here for outreach actions."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No companies match these filters"
            description="Try clearing filters to see your complete outreach queue."
          />
        ) : (
          <div className="overflow-x-auto pb-1">
            <div className="grid min-w-[1040px] grid-cols-[420px_minmax(0,1fr)] items-start gap-4">
              <div
                className="card sticky top-4 flex min-h-0 flex-col overflow-hidden self-start"
                style={{
                  height: taskListHeight
                    ? `${Math.ceil(taskListHeight)}px`
                    : "calc(100vh - 9.5rem)",
                }}
              >
                <div className="border-b border-(--card-border) px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Tasks
                  </p>
                </div>
                <div className="schedule-scroll min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable] p-2">
                  <div className="space-y-2">
                    {filtered.map((entry) => {
                      const isSelected = entry.companyId === selectedCompanyId;
                      return (
                        <button
                          key={entry.companyId}
                          type="button"
                          onClick={() => setSelectedCompanyId(entry.companyId)}
                          className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                            isSelected
                              ? "border-[#93C5FD] bg-[#EFF6FF] shadow-sm"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#3B82F6] bg-[#3B82F6] text-sm font-semibold text-white">
                              {entry.companyName.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {entry.companyName}
                                  </p>
                                  <p className="mt-0.5 truncate text-xs text-slate-500">
                                    {entry.industry}
                                  </p>
                                </div>
                                <Badge size="sm" variant="gray">
                                  {entry.seasons.length} seasons
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div
                ref={detailsCardRef}
                className="card w-full max-w-full min-w-0 self-start overflow-hidden p-4"
              >
                {selectedEntry ? (
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] text-base font-semibold text-[#1D4ED8]">
                        {selectedEntry.companyName.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link
                              href={`/companies/${selectedEntry.companyId}`}
                              className="block truncate text-base font-semibold text-slate-900 hover:text-[#2563EB]"
                            >
                              {selectedEntry.companyName}
                            </Link>
                            <div className="mt-1 flex flex-wrap gap-2">
                              <Badge size="sm" variant="gray">
                                {selectedEntry.industry}
                              </Badge>
                              <Badge size="sm" variant="info">
                                {selectedEntry.contacts.length} contacts
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Last Contacted
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-sm font-medium text-slate-700">
                          <Clock
                            size={12}
                            className="shrink-0 text-slate-400"
                          />
                          {formatDate(latestContacted(selectedEntry.seasons))}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Next Follow-up
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-sm font-medium text-[#1D4ED8]">
                          <CheckCircle2 size={12} className="shrink-0" />
                          {formatDate(nearestFollowUp(selectedEntry.seasons))}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Active Seasons
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {selectedEntry.seasons.length}
                        </p>
                      </div>
                    </div>

                    <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(420px,1.15fr)_minmax(300px,0.85fr)]">
                      <div
                        ref={detailLeftColumnRef}
                        className="flex flex-col space-y-4"
                      >
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="text-sm font-semibold text-slate-800">
                              Contacts
                            </h4>
                            <Badge size="sm" variant="gray">
                              {selectedEntry.contacts.length} total
                            </Badge>
                          </div>
                          <div className="mt-3 space-y-3">
                            {selectedEntry.contacts.length > 0 ? (
                              selectedEntry.contacts.map((contact) => (
                                <div
                                  key={contact.id}
                                  className="rounded-xl border border-white bg-white px-3 py-3"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-slate-800">
                                        {contact.name}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        {contact.designation}
                                      </p>
                                    </div>
                                    {contact.linkedin ? (
                                      <a
                                        href={contact.linkedin}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs font-medium text-[#1D4ED8] hover:underline"
                                      >
                                        LinkedIn
                                      </a>
                                    ) : null}
                                  </div>
                                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-600">
                                    <div>
                                      <p className="mb-1 font-semibold uppercase tracking-wide text-[10px] text-slate-400">
                                        Phones
                                      </p>
                                      <div className="space-y-1">
                                        {contact.phones.length > 0 ? (
                                          contact.phones.map((phone) => (
                                            <a
                                              key={phone}
                                              href={`tel:${phone}`}
                                              className="flex items-center gap-1.5 hover:text-[#1D4ED8]"
                                            >
                                              <Phone
                                                size={12}
                                                className="shrink-0"
                                              />
                                              {phone}
                                            </a>
                                          ))
                                        ) : (
                                          <p>-</p>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <p className="mb-1 font-semibold uppercase tracking-wide text-[10px] text-slate-400">
                                        Emails
                                      </p>
                                      <div className="space-y-1 break-all">
                                        {contact.emails.length > 0 ? (
                                          contact.emails.map((email) => (
                                            <a
                                              key={email}
                                              href={`mailto:${email}`}
                                              className="flex items-center gap-1.5 hover:text-[#1D4ED8]"
                                            >
                                              <Mail
                                                size={12}
                                                className="shrink-0"
                                              />
                                              {email}
                                            </a>
                                          ))
                                        ) : (
                                          <p>-</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-sm text-slate-500">
                                No contacts added for this company yet.
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-slate-800">
                              Status and Actions
                            </h4>
                            <p className="mt-1 text-xs text-slate-500">
                              Update season status, log interactions, or queue
                              outreach.
                            </p>
                          </div>
                          <ActionModals
                            entry={selectedEntry}
                            templates={templates}
                            currentUser={currentUser}
                            mailSubmitting={mailSubmitting}
                            logSubmitting={logSubmitting}
                            statusSubmitting={statusSubmitting}
                            mailError={mailError}
                            logError={logError}
                            statusError={statusError}
                            onQueueMail={handleQueueMail}
                            onLog={handleLog}
                            onUpdateStatus={handleStatusUpdate}
                            replyContext={
                              pendingReplyContext &&
                              pendingReplyContext.recipientEmail &&
                              selectedEntry.companyId === selectedCompanyId
                                ? pendingReplyContext
                                : null
                            }
                            onReplyContextConsumed={() =>
                              setPendingReplyContext(null)
                            }
                          />
                        </div>
                      </div>

                      <div
                        className="flex min-h-0 min-w-0 flex-col gap-4 overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-4"
                        style={{
                          height: detailColumnsHeight
                            ? `${Math.ceil(detailColumnsHeight)}px`
                            : undefined,
                        }}
                      >
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="text-sm font-semibold text-slate-800">
                                Mail Tracker
                              </h4>
                              <p className="mt-1 text-xs text-slate-500">
                                Track inbound and outbound mail threads mapped
                                to this company.
                              </p>
                            </div>
                            <Link
                              href={`/outreach/${selectedEntry.companyId}/mails`}
                              className="btn btn-primary btn-sm gap-1"
                            >
                              Show Mails
                              <ArrowRight size={14} />
                            </Link>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 pb-4">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800">
                              Activity Timeline
                            </h4>
                            <p className="mt-1 text-xs text-slate-500">
                              Calls, mails, and notes logged for this company.
                            </p>
                          </div>
                          <Badge size="sm" variant="gray">
                            {selectedEntry.interactions.length}
                          </Badge>
                        </div>

                        {selectedEntry.interactions.length > 0 ? (
                          <div className="schedule-scroll min-h-0 flex-1 overflow-y-auto pr-1">
                            <div className="space-y-0 pr-2">
                              {selectedEntry.interactions.map(
                                (interaction, index) => {
                                  const meta = getInteractionMeta(
                                    interaction.action,
                                  );
                                  const Icon = meta.icon;
                                  const isLast =
                                    index ===
                                    selectedEntry.interactions.length - 1;

                                  return (
                                    <div
                                      key={interaction.id}
                                      className="flex gap-3"
                                    >
                                      <div className="flex shrink-0 flex-col items-center">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#DBEAFE] bg-[#EFF6FF]">
                                          <Icon
                                            size={14}
                                            className="text-[#2563EB]"
                                          />
                                        </div>
                                        {!isLast && (
                                          <div className="my-1 w-0.5 flex-1 bg-slate-100" />
                                        )}
                                      </div>

                                      <div
                                        className={`${isLast ? "pb-0" : "pb-5"} min-w-0 flex-1`}
                                      >
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span
                                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.badgeClass}`}
                                          >
                                            {meta.label}
                                          </span>
                                          <span className="text-[11px] text-slate-400">
                                            {formatDateTime(
                                              interaction.createdAt,
                                            )}
                                          </span>
                                        </div>
                                        <p className="mt-2 text-sm font-medium text-slate-800">
                                          {interaction.summary}
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                                          {interaction.contactName ? (
                                            <span className="rounded-full bg-slate-100 px-2 py-1">
                                              {interaction.contactName}
                                            </span>
                                          ) : null}
                                          {interaction.season ? (
                                            <span className="rounded-full bg-slate-100 px-2 py-1">
                                              {interaction.season}
                                            </span>
                                          ) : null}
                                          {interaction.outcome ? (
                                            <span className="rounded-full bg-slate-100 px-2 py-1">
                                              Outcome: {interaction.outcome}
                                            </span>
                                          ) : null}
                                          {interaction.nextFollowUpAt ? (
                                            <span className="rounded-full bg-[#EFF6FF] px-2 py-1 text-[#1D4ED8]">
                                              Follow-up:{" "}
                                              {formatDate(
                                                interaction.nextFollowUpAt,
                                              )}
                                            </span>
                                          ) : null}
                                        </div>
                                        <p className="mt-2 text-xs text-slate-400">
                                          Logged by {interaction.createdBy}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                },
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                            Logged outreach activity will appear here.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <EmptyState
                      icon={Building2}
                      title="Select a task"
                      description="Choose a company from the list to view its full outreach details and actions."
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
