"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  PhoneCall,
  Send,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import FilterSelect from "@/components/ui/FilterSelect";
import Modal from "@/components/ui/Modal";
import SearchBar from "@/components/ui/SearchBar";

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

type OutreachEntry = {
  id: string;
  companySeasonCycleId: string;
  companyId: string;
  companyName: string;
  industry: string;
  status: OutreachStatus;
  season: string;
  assignedTo: string;
  contacts: Contact[];
  lastContacted: string | null;
  nextFollowUp: string | null;
};

type OutreachResponse = {
  user: { id: string; name: string };
  entries: OutreachEntry[];
};

type MailTemplate = {
  id: string;
  name: string;
  subject: string;
  status: string;
  bodyHtml?: string | null;
  bodyText?: string | null;
  variables: string[];
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

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

function CardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="shimmer h-9 w-9 rounded-lg" />
        <div className="space-y-2">
          <div className="shimmer h-4 w-32 rounded-full" />
          <div className="flex gap-2">
            <div className="shimmer h-5 w-16 rounded-full" />
            <div className="shimmer h-5 w-24 rounded-full" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="shimmer h-3 w-20 rounded-full" />
            <div className="shimmer mt-2 h-4 w-24 rounded-full" />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="shimmer h-8 w-20 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function LoadingView() {
  return (
    <div className="-mt-6 xl:mt-0 space-y-5 px-4 pb-6 animate-fade-in xl:h-full xl:overflow-y-auto hide-scrollbar">
      <div className="relative z-0 pt-10">
        <div className="card px-5 py-4 sm:px-6 sm:py-5">
          <div className="space-y-3">
            <div className="shimmer h-3 w-32 rounded-full" />
            <div className="shimmer h-8 w-72 max-w-full rounded-full" />
            <div className="shimmer h-4 w-80 max-w-full rounded-full" />
            <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="rounded-xl border border-[#1D4ED8] bg-[#2563EB] px-3 py-2.5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="shimmer h-3 w-16 rounded-full bg-white/30" />
                      <div className="shimmer h-7 w-10 rounded-full bg-white/30" />
                    </div>
                    <div className="shimmer h-8 w-8 rounded-lg bg-white/60" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="border-b border-(--card-border) px-4 py-3">
          <div className="flex flex-col gap-2 md:flex-row">
            <div className="shimmer h-10 flex-1 rounded-xl" />
            <div className="grid grid-cols-2 gap-2 md:flex">
              <div className="shimmer h-10 w-full rounded-xl md:w-32" />
              <div className="shimmer h-10 w-full rounded-xl md:w-36" />
            </div>
          </div>
        </div>
      </div>
      <div className="card p-4">
        <div className="shimmer mb-4 h-5 w-24 rounded-full" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MailModal({
  isOpen,
  onClose,
  entry,
  templates,
  submitting,
  errorMessage,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  entry: OutreachEntry;
  templates: MailTemplate[];
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (payload: {
    contactId: string;
    requestType: "template" | "custom";
    templateId?: string;
    templateVariables?: Record<string, string>;
    previewPayload?: Record<string, unknown>;
    customSubject?: string;
    customBody?: string;
  }) => Promise<void>;
}) {
  const [contactId, setContactId] = useState("");
  const [requestType, setRequestType] = useState<"template" | "custom">("template");
  const [templateId, setTemplateId] = useState("");
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");
  const selectedTemplate = templates.find((template) => template.id === templateId);
  const requiredVariables = selectedTemplate?.variables ?? [];
  const missingTemplateVariables = requiredVariables.filter(
    (variable) => !templateVariables[variable]?.trim(),
  );

  useEffect(() => {
    if (!isOpen) {
      setContactId("");
      setRequestType("template");
      setTemplateId("");
      setTemplateVariables({});
      setCustomSubject("");
      setCustomBody("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!selectedTemplate) {
      setTemplateVariables({});
      return;
    }

    setTemplateVariables((current) => {
      const next = Object.fromEntries(
        selectedTemplate.variables.map((variable) => [variable, current[variable] ?? ""]),
      );
      return next;
    });
  }, [selectedTemplate]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Send Mail - ${entry.companyName}`}
      size="md"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() =>
              void onSubmit({
                contactId,
                requestType,
                templateId,
                templateVariables:
                  requestType === "template" ? templateVariables : undefined,
                previewPayload:
                  requestType === "template" && selectedTemplate
                    ? {
                        templateVariables,
                        subject: interpolateTemplate(selectedTemplate.subject, templateVariables),
                        htmlBody: interpolateTemplate(selectedTemplate.bodyHtml, templateVariables),
                        textBody: interpolateTemplate(
                          selectedTemplate.bodyText ?? selectedTemplate.bodyHtml ?? "",
                          templateVariables,
                        ),
                      }
                    : undefined,
                customSubject,
                customBody,
              })
            }
            disabled={
              submitting ||
              !contactId ||
              (requestType === "template"
                ? !templateId || missingTemplateVariables.length > 0
                : !customSubject || !customBody)
            }
          >
            <Send size={14} />
            {submitting ? "Queueing..." : "Send to Queue"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {errorMessage && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</div>}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Send to Contact</label>
          <ContactSelect contacts={entry.contacts} value={contactId} onChange={setContactId} placeholder="Select a contact" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Mail Type</label>
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
        </div>
        {requestType === "template" ? (
          <div className="space-y-4">
            <select className="input-base" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
              <option value="">Select a template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.status})
                </option>
              ))}
            </select>
            {selectedTemplate && requiredVariables.length > 0 && (
              <div className="space-y-3 rounded-xl border border-[#DBEAFE] bg-[#F8FBFF] p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Fill template variables
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    These values are required before the mail request can be queued.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {requiredVariables.map((variable) => (
                    <div key={variable}>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        {variable.replace(/_/g, " ")} *
                      </label>
                      <input
                        className="input-base"
                        value={templateVariables[variable] ?? ""}
                        onChange={(event) =>
                          setTemplateVariables((current) => ({
                            ...current,
                            [variable]: event.target.value,
                          }))
                        }
                        placeholder={`Enter ${variable.replace(/_/g, " ")}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <input className="input-base" value={customSubject} onChange={(event) => setCustomSubject(event.target.value)} placeholder="Email subject" />
            <textarea rows={5} className="input-base" value={customBody} onChange={(event) => setCustomBody(event.target.value)} placeholder="Write the email content" />
          </div>
        )}
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>Mail requests are queued for approval before dispatch.</span>
        </div>
      </div>
    </Modal>
  );
}

function LogModal({
  isOpen,
  onClose,
  entry,
  submitting,
  errorMessage,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  entry: OutreachEntry;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (payload: {
    action: "call" | "email" | "note";
    contactId?: string;
    summary: string;
    outcome?: string;
    nextFollowUpAt?: string;
  }) => Promise<void>;
}) {
  const [action, setAction] = useState<"call" | "email" | "note">("call");
  const [contactId, setContactId] = useState("");
  const [summary, setSummary] = useState("");
  const [outcome, setOutcome] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setAction("call");
      setContactId("");
      setSummary("");
      setOutcome("");
      setNextFollowUpAt("");
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Log Interaction - ${entry.companyName}`}
      size="sm"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => void onSubmit({
              action,
              contactId: contactId || undefined,
              summary,
              outcome: outcome || undefined,
              nextFollowUpAt: nextFollowUpAt ? new Date(`${nextFollowUpAt}T09:00:00`).toISOString() : undefined,
            })}
            disabled={submitting || !summary.trim()}
          >
            {submitting ? "Saving..." : "Log"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {errorMessage && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</div>}
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
        <ContactSelect contacts={entry.contacts} value={contactId} onChange={setContactId} placeholder="Company-wide note (optional)" />
        <textarea rows={3} className="input-base" value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="What happened in this interaction?" />
        <input className="input-base" value={outcome} onChange={(event) => setOutcome(event.target.value)} placeholder="Interested, callback requested, no response..." />
        <input type="date" className="input-base" value={nextFollowUpAt} onChange={(event) => setNextFollowUpAt(event.target.value)} />
      </div>
    </Modal>
  );
}

function CallModal({ isOpen, onClose, entry }: { isOpen: boolean; onClose: () => void; entry: OutreachEntry }) {
  const [contactId, setContactId] = useState("");
  useEffect(() => {
    if (!isOpen) setContactId("");
  }, [isOpen]);
  const selected = entry.contacts.find((contact) => contact.id === contactId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Call - ${entry.companyName}`}
      size="sm"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <a href={selected?.phones[0] ? `tel:${selected.phones[0]}` : undefined} className={`btn btn-primary ${!selected?.phones[0] ? "pointer-events-none opacity-45" : ""}`}>
            <Phone size={14} />
            Call Now
          </a>
        </>
      }
    >
      <div className="space-y-4">
        <ContactSelect contacts={entry.contacts} value={contactId} onChange={setContactId} placeholder="Select a contact to call" />
        {selected ? (
          <div className="rounded-lg border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-slate-800">{selected.name}</p>
            <p className="text-xs text-slate-500">{selected.designation}</p>
            {selected.phones.map((phone) => (
              <a key={phone} href={`tel:${phone}`} className="flex items-center gap-2 text-sm font-medium text-[#1D4ED8] hover:underline">
                <Phone size={13} />
                {phone}
              </a>
            ))}
          </div>
        ) : (
          <p className="py-2 text-center text-xs text-slate-400">Select a contact to see phone numbers.</p>
        )}
      </div>
    </Modal>
  );
}

function OutreachCard({
  entry,
  templates,
  mailSubmitting,
  logSubmitting,
  mailError,
  logError,
  onQueueMail,
  onLog,
}: {
  entry: OutreachEntry;
  templates: MailTemplate[];
  mailSubmitting: boolean;
  logSubmitting: boolean;
  mailError: string | null;
  logError: string | null;
  onQueueMail: (entry: OutreachEntry, payload: { contactId: string; requestType: "template" | "custom"; templateId?: string; templateVariables?: Record<string, string>; previewPayload?: Record<string, unknown>; customSubject?: string; customBody?: string }) => Promise<void>;
  onLog: (entry: OutreachEntry, payload: { action: "call" | "email" | "note"; contactId?: string; summary: string; outcome?: string; nextFollowUpAt?: string }) => Promise<void>;
}) {
  const [showMail, setShowMail] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showCall, setShowCall] = useState(false);
  const status = STATUS_STYLE[entry.status];

  return (
    <>
      <div className="card p-4 space-y-3 hover:shadow-sm transition-shadow">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#DBEAFE] bg-[#EFF6FF] text-sm font-semibold text-[#1D4ED8] shrink-0">{entry.companyName.charAt(0)}</div>
          <div className="min-w-0">
            <Link href={`/companies/${entry.companyId}`} className="block truncate text-sm font-semibold text-slate-900 hover:text-[#2563EB]">{entry.companyName}</Link>
            <div className="mt-0.5 flex flex-wrap gap-2">
              <Badge size="sm" variant="gray">{entry.industry}</Badge>
              <Badge size="sm" variant="danger">{entry.season}</Badge>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Last Contacted</p>
            <p className="flex items-center gap-1 text-xs font-medium text-slate-700"><Clock size={11} className="shrink-0 text-slate-400" />{formatDate(entry.lastContacted)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Next Follow-up</p>
            <p className="flex items-center gap-1 text-xs font-medium text-[#1D4ED8]"><CheckCircle2 size={11} className="shrink-0" />{formatDate(entry.nextFollowUp)}</p>
          </div>
          <div className={`rounded-lg border px-3 py-2 ${status.bg} ${status.border}`}>
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Status</p>
            <p className={`text-xs font-semibold ${status.text}`}>{status.label}</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={() => setShowLog(true)} className="btn btn-secondary btn-sm gap-1"><MessageSquare size={13} />Log</button>
          <button onClick={() => setShowCall(true)} className="btn btn-primary btn-sm gap-1"><Phone size={13} />Call</button>
          <button onClick={() => setShowMail(true)} className="btn btn-primary btn-sm gap-1"><Mail size={13} />Mail</button>
        </div>
      </div>
      <MailModal isOpen={showMail} onClose={() => setShowMail(false)} entry={entry} templates={templates} submitting={mailSubmitting} errorMessage={mailError} onSubmit={async (payload) => { await onQueueMail(entry, payload); setShowMail(false); }} />
      <LogModal isOpen={showLog} onClose={() => setShowLog(false)} entry={entry} submitting={logSubmitting} errorMessage={logError} onSubmit={async (payload) => { await onLog(entry, payload); setShowLog(false); }} />
      <CallModal isOpen={showCall} onClose={() => setShowCall(false)} entry={entry} />
    </>
  );
}

export default function OutreachPage() {
  const [entries, setEntries] = useState<OutreachEntry[]>([]);
  const [templates, setTemplates] = useState<MailTemplate[]>([]);
  const [currentUserName, setCurrentUserName] = useState("Coordinator");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [seasonFilter, setSeasonFilter] = useState<string[]>([]);
  const [mailSubmitting, setMailSubmitting] = useState(false);
  const [logSubmitting, setLogSubmitting] = useState(false);
  const [mailError, setMailError] = useState<string | null>(null);
  const [logError, setLogError] = useState<string | null>(null);

  const loadOutreach = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const [outreachRes, templatesRes] = await Promise.all([
        requestJson<OutreachResponse>("/api/v1/outreach"),
        requestJson<MailTemplate[]>("/api/v1/mail/templates").catch(() => ({ data: [] })),
      ]);
      setEntries(outreachRes.data?.entries ?? []);
      setCurrentUserName(outreachRes.data?.user.name ?? "Coordinator");
      setTemplates((templatesRes.data ?? []).filter((template) => template.status !== "archived"));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to load outreach queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOutreach();
  }, [loadOutreach]);

  const seasonOptions = useMemo(() => Array.from(new Set(entries.map((entry) => entry.season))).map((season) => ({ value: season, label: season })), [entries]);

  const filtered = useMemo(() => {
    let data = entries;
    if (search) {
      const query = search.toLowerCase();
      data = data.filter((entry) => entry.companyName.toLowerCase().includes(query) || entry.industry.toLowerCase().includes(query) || entry.contacts.some((contact) => contact.name.toLowerCase().includes(query)));
    }
    if (statusFilter.length > 0) data = data.filter((entry) => statusFilter.includes(entry.status));
    if (seasonFilter.length > 0) data = data.filter((entry) => seasonFilter.includes(entry.season));
    return data;
  }, [entries, search, seasonFilter, statusFilter]);

  const followUpsDue = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return entries.filter((entry) => {
      if (!entry.nextFollowUp) return false;
      const date = new Date(entry.nextFollowUp);
      date.setHours(0, 0, 0, 0);
      return date <= today;
    }).length;
  }, [entries]);

  const stats = useMemo(() => ({
    assigned: entries.length,
    contacted: entries.filter((entry) => entry.lastContacted).length,
    pending: entries.filter((entry) => entry.status === "not_contacted").length,
    followUpsDue,
  }), [entries, followUpsDue]);

  const handleQueueMail = async (entry: OutreachEntry, payload: { contactId: string; requestType: "template" | "custom"; templateId?: string; templateVariables?: Record<string, string>; previewPayload?: Record<string, unknown>; customSubject?: string; customBody?: string }) => {
    setMailError(null);
    setMailSubmitting(true);
    try {
      const contact = entry.contacts.find((item) => item.id === payload.contactId);
      if (!contact) throw new Error("Please select a contact");
      await requestJson("/api/v1/mail/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: entry.companyId,
          companySeasonCycleId: entry.companySeasonCycleId,
          requestType: payload.requestType,
          templateId: payload.requestType === "template" ? payload.templateId : undefined,
          previewPayload: payload.requestType === "template" ? payload.previewPayload : undefined,
          customSubject: payload.requestType === "custom" ? payload.customSubject : undefined,
          customBody: payload.requestType === "custom" ? payload.customBody : undefined,
          recipientFilter: {
            contactIds: [contact.id],
            emails: contact.emails,
            templateVariables:
              payload.requestType === "template" ? payload.templateVariables : undefined,
          },
        }),
      });
    } catch (error) {
      setMailError(error instanceof Error ? error.message : "Unable to queue mail request");
      throw error;
    } finally {
      setMailSubmitting(false);
    }
  };

  const handleLog = async (entry: OutreachEntry, payload: { action: "call" | "email" | "note"; contactId?: string; summary: string; outcome?: string; nextFollowUpAt?: string }) => {
    setLogError(null);
    setLogSubmitting(true);
    try {
      await requestJson("/api/v1/outreach/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: entry.companyId,
          companySeasonCycleId: entry.companySeasonCycleId,
          ...payload,
        }),
      });
      await loadOutreach();
    } catch (error) {
      setLogError(error instanceof Error ? error.message : "Unable to log interaction");
      throw error;
    } finally {
      setLogSubmitting(false);
    }
  };

  if (loading) return <LoadingView />;

  return (
    <div className="-mt-6 xl:mt-0 space-y-5 px-4 pb-6 animate-fade-in xl:h-full xl:overflow-y-auto hide-scrollbar">
      <div className="relative z-0 pt-10">
        <div className="card relative overflow-hidden px-5 py-4 sm:px-6 sm:py-5" style={{ background: "#FFFFFF", borderColor: "#DBEAFE" }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#2563EB]">Personal Outreach Desk</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Hello {currentUserName}, check the tasks lined up for you.</h1>
          <p className="mt-1.5 text-sm font-bold text-[#2563EB]">This page shows your assigned companies for calls, mails, and follow-ups.</p>
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[{ title: "Queue Size", value: stats.assigned, icon: Building2 }, { title: "Contacted", value: stats.contacted, icon: PhoneCall }, { title: "Pending", value: stats.pending, icon: Clock }, { title: "Follow-ups Due", value: stats.followUpsDue, icon: CheckCircle2 }].map((item) => (
              <div key={item.title} className="rounded-xl border border-[#1D4ED8] bg-[#2563EB] px-3 py-2.5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white">{item.title}</p>
                    <p className="mt-1 text-2xl font-bold leading-none text-black">{item.value}</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DBEAFE] bg-white"><item.icon size={20} color="#2563EB" /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="border-b border-(--card-border) px-4 py-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <SearchBar value={search} onChange={setSearch} placeholder="Search by company, industry, or contact..." className="flex-1 min-w-0" />
            <div className="grid grid-cols-2 gap-2 md:flex">
              <FilterSelect multiple value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} placeholder="Status" className="w-full md:w-32" />
              <FilterSelect multiple value={seasonFilter} onChange={setSeasonFilter} options={seasonOptions} placeholder="Season" className="w-full md:w-36" />
            </div>
            {(statusFilter.length + seasonFilter.length) > 0 && <button className="btn btn-ghost btn-sm shrink-0 text-slate-500 hover:text-slate-700" onClick={() => { setStatusFilter([]); setSeasonFilter([]); }}>Clear</button>}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="mb-4 text-sm font-semibold text-slate-800">Task List</h3>
        {pageError ? (
          <EmptyState icon={Building2} title="Unable to load outreach queue" description={pageError} />
        ) : entries.length === 0 ? (
          <EmptyState icon={Building2} title="No companies assigned yet" description="Once assignments are made to you, they will appear here for outreach actions." />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Building2} title="No companies match these filters" description="Try clearing filters to see your complete outreach queue." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((entry) => (
              <OutreachCard key={entry.id} entry={entry} templates={templates} mailSubmitting={mailSubmitting} logSubmitting={logSubmitting} mailError={mailError} logError={logError} onQueueMail={handleQueueMail} onLog={handleLog} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
