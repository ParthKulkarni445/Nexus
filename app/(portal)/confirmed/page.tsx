"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  AlertCircle,
  Building2,
  CalendarPlus,
  FileSpreadsheet,
  Loader2,
  Mail,
  PhoneCall,
  Search,
  Send,
  Upload,
  Users,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import FilterSelect from "@/components/ui/FilterSelect";
import Modal from "@/components/ui/Modal";
import SearchBar from "@/components/ui/SearchBar";

type ApiResponse<T> = {
  data?: T;
  error?: {
    message?: string;
  };
};

type MailAttachmentMeta = {
  id?: string;
  fileName: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  storagePath: string;
  publicUrl: string;
};

type ConfirmedDrive = {
  id: string;
  title: string;
  stage: string;
  status: "tentative" | "confirmed" | "completed" | "cancelled";
  companyId: string;
  companyName: string;
  companySeasonCycleId: string;
  seasonId: string;
  seasonName: string;
  seasonType: "intern" | "placement";
  startAt: string | null;
  endAt: string | null;
};

type TelegramTemplate = {
  id: string;
  name: string;
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  updatedAt: string;
};

type ConfirmedCompany = {
  companySeasonCycleId: string;
  companyId: string;
  companyName: string;
  status: "accepted";
  notes: string | null;
  season: {
    id: string;
    name: string;
    seasonType: "intern" | "placement";
  };
  roles: string[];
  contacts: Array<{
    id: string;
    name: string;
    designation: string | null;
    phones: string[];
    emails: string[];
  }>;
};

type ConfirmedPayload = {
  drives: ConfirmedDrive[];
  selectedDriveId: string | null;
  acceptedCompanies: ConfirmedCompany[];
  telegramTemplates: TelegramTemplate[];
};

type ScheduleFormState = {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
};

const DEFAULT_SCHEDULE_FORM: ScheduleFormState = {
  title: "",
  description: "",
  startTime: "",
  endTime: "",
};

function htmlToText(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

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

  if (!body.data) {
    throw new Error("Missing response data");
  }

  return body.data;
}

function UploadedFileName({
  attachment,
  uploading,
}: {
  attachment: MailAttachmentMeta | null;
  uploading: boolean;
}) {
  if (uploading) {
    return (
      <p className="text-xs text-slate-500 inline-flex items-center gap-1">
        <Loader2 size={12} className="animate-spin" />
        Uploading...
      </p>
    );
  }

  if (!attachment) {
    return <p className="text-xs text-slate-500">No file selected</p>;
  }

  return (
    <p className="text-xs text-emerald-700 font-medium truncate" title={attachment.fileName}>
      {attachment.fileName}
    </p>
  );
}

export default function ConfirmedPage() {
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const [drives, setDrives] = useState<ConfirmedDrive[]>([]);
  const [acceptedCompanies, setAcceptedCompanies] = useState<ConfirmedCompany[]>([]);
  const [telegramTemplates, setTelegramTemplates] = useState<TelegramTemplate[]>([]);

  const [selectedDrive, setSelectedDrive] = useState("");
  const [query, setQuery] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedContactByCompany, setSelectedContactByCompany] = useState<Record<string, string>>({});
  const [manualTelegramByCompany, setManualTelegramByCompany] = useState<Record<string, string>>({});
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);
  const [telegramCompanyId, setTelegramCompanyId] = useState("");
  const [telegramTemplateId, setTelegramTemplateId] = useState("");

  const [sheetOneByCompany, setSheetOneByCompany] = useState<Record<string, MailAttachmentMeta | null>>({});
  const [sheetTwoByCompany, setSheetTwoByCompany] = useState<Record<string, MailAttachmentMeta | null>>({});
  const [uploadingBySlot, setUploadingBySlot] = useState<Record<string, boolean>>({});

  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [submittingAction, setSubmittingAction] = useState<Record<string, boolean>>({});

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleTargetCompanyId, setScheduleTargetCompanyId] = useState("");
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState>(DEFAULT_SCHEDULE_FORM);

  async function fetchConfirmedData(nextDriveId?: string) {
    setLoading(true);
    setLoadingError(null);

    try {
      const search = nextDriveId ? `?driveId=${encodeURIComponent(nextDriveId)}` : "";
      const payload = await requestJson<ConfirmedPayload>(`/api/v1/confirmed${search}`);

      setDrives(payload.drives);
      setAcceptedCompanies(payload.acceptedCompanies);
      setTelegramTemplates(payload.telegramTemplates);
      setSelectedDrive(payload.selectedDriveId ?? "");
      setSelectedCompanyId("");
      setTelegramCompanyId("");
      setTelegramTemplateId("");
    } catch (error) {
      setLoadingError(error instanceof Error ? error.message : "Unable to load confirmed data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchConfirmedData();
  }, []);

  const filteredCompanies = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return acceptedCompanies;

    return acceptedCompanies.filter((company) => {
      const rolesText = company.roles.join(" ").toLowerCase();
      return (
        company.companyName.toLowerCase().includes(normalized) ||
        rolesText.includes(normalized) ||
        (company.notes ?? "").toLowerCase().includes(normalized)
      );
    });
  }, [acceptedCompanies, query]);

  const telegramCompany = useMemo(
    () => filteredCompanies.find((company) => company.companyId === telegramCompanyId) ?? null,
    [filteredCompanies, telegramCompanyId],
  );

  const telegramContact = useMemo(() => {
    if (!telegramCompany) return null;
    const selectedContactId = selectedContactByCompany[telegramCompany.companyId];
    if (!selectedContactId) return null;
    return telegramCompany.contacts.find((contact) => contact.id === selectedContactId) ?? null;
  }, [telegramCompany, selectedContactByCompany]);

  const driveOptions = drives.map((drive) => ({
    value: drive.id,
    label: `${drive.title} (${drive.seasonName})`,
  }));

  const templateOptions = telegramTemplates.map((template) => ({
    value: template.id,
    label: template.name,
  }));

  async function handleDriveChange(nextDriveId: string) {
    setActionError("");
    setActionMessage("");
    await fetchConfirmedData(nextDriveId);
  }

  async function uploadAttachment(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    return requestJson<MailAttachmentMeta>("/api/v1/mail/attachments/upload", {
      method: "POST",
      body: formData,
    });
  }

  async function onUploadSheet(
    companyId: string,
    slot: "sheetOne" | "sheetTwo",
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    const key = `${companyId}:${slot}`;
    setUploadingBySlot((prev) => ({ ...prev, [key]: true }));
    setActionError("");
    setActionMessage("");

    try {
      const uploaded = await uploadAttachment(file);
      if (slot === "sheetOne") {
        setSheetOneByCompany((prev) => ({ ...prev, [companyId]: uploaded }));
      } else {
        setSheetTwoByCompany((prev) => ({ ...prev, [companyId]: uploaded }));
      }
      setActionMessage(`Uploaded ${file.name}`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploadingBySlot((prev) => ({ ...prev, [key]: false }));
      event.target.value = "";
    }
  }

  function downloadPlaceholderComparison(company: ConfirmedCompany) {
    const superset = sheetOneByCompany[company.companyId]?.fileName ?? "";
    const acadly = sheetTwoByCompany[company.companyId]?.fileName ?? "";
    const csv = [
      "company,companySeasonCycleId,superset_sheet,acadly_attendence_sheet,note",
      `"${company.companyName}","${company.companySeasonCycleId}","${superset}","${acadly}","comparison logic pending"`,
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${company.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-comparison.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function getAttachmentsForCompany(companyId: string) {
    const slot1 = sheetOneByCompany[companyId] ?? null;
    const slot2 = sheetTwoByCompany[companyId] ?? null;
    return [slot1, slot2].filter(Boolean) as MailAttachmentMeta[];
  }

  async function logCall(company: ConfirmedCompany) {
    const actionKey = `call:${company.companyId}`;
    const contactId = selectedContactByCompany[company.companyId];

    if (!contactId) {
      setActionError("Choose an HR/contact before calling.");
      return;
    }

    setSubmittingAction((prev) => ({ ...prev, [actionKey]: true }));
    setActionError("");
    setActionMessage("");

    try {
      await requestJson(`/api/v1/contacts/${contactId}/quick-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "call",
          summary: `Called HR for ${company.companyName} from Confirmed tab`,
          companySeasonCycleId: company.companySeasonCycleId,
        }),
      });
      setActionMessage("Call interaction logged successfully.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to log call interaction");
    } finally {
      setSubmittingAction((prev) => ({ ...prev, [actionKey]: false }));
    }
  }

  function openScheduleModal(company: ConfirmedCompany) {
    setScheduleTargetCompanyId(company.companyId);
    setScheduleForm({
      ...DEFAULT_SCHEDULE_FORM,
      title: `${company.companyName} - Hiring Event`,
    });
    setScheduleModalOpen(true);
  }

  async function createSchedule() {
    if (!scheduleTargetCompanyId) return;

    setSubmittingAction((prev) => ({ ...prev, schedule: true }));
    setActionError("");
    setActionMessage("");

    try {
      await requestJson("/api/v1/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: scheduleTargetCompanyId,
          title: scheduleForm.title,
          description: scheduleForm.description || undefined,
          startTime: new Date(scheduleForm.startTime).toISOString(),
          endTime: new Date(scheduleForm.endTime).toISOString(),
        }),
      });

      setScheduleModalOpen(false);
      setActionMessage("Schedule event created.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to create schedule");
    } finally {
      setSubmittingAction((prev) => ({ ...prev, schedule: false }));
    }
  }

  async function sendMailRequest(company: ConfirmedCompany, mode: "students" | "company") {
    const actionKey = `mail:${mode}:${company.companyId}`;
    setSubmittingAction((prev) => ({ ...prev, [actionKey]: true }));
    setActionError("");
    setActionMessage("");

    try {
      const selectedContactId = selectedContactByCompany[company.companyId];
      const contact = company.contacts.find((item) => item.id === selectedContactId) ?? null;
      const body = (manualTelegramByCompany[company.companyId] ?? "").trim();
      const attachments = getAttachmentsForCompany(company.companyId);

      if (mode === "company" && !contact) {
        throw new Error("Choose an HR/contact before sending company mail request.");
      }

      await requestJson("/api/v1/mail/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.companyId,
          companySeasonCycleId: company.companySeasonCycleId,
          requestType: "custom",
          customSubject:
            mode === "students"
              ? `${company.companyName} update for students`
              : `${company.companyName} follow-up`,
          customBody: body || undefined,
          recipientFilter:
            mode === "students"
              ? { audience: "all_students", source: "confirmed_tab" }
              : {
                  audience: "company_contact",
                  contactId: contact?.id,
                  emails: contact?.emails ?? [],
                },
          previewPayload: {
            source: "confirmed_tab",
            mode,
            companyName: company.companyName,
            contactName: contact?.name ?? null,
          },
          attachments,
          urgency: 3,
        }),
      });

      setActionMessage(
        mode === "students"
          ? "Mailing request queued for students."
          : "Mailing request queued for selected company contact.",
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to create mail request");
    } finally {
      setSubmittingAction((prev) => ({ ...prev, [actionKey]: false }));
    }
  }

  function buildTelegramCompanyContext(company: ConfirmedCompany) {
    const roles = company.roles.length ? company.roles.join(", ") : "Not mapped";
    const contact = (() => {
      const selectedContactId = selectedContactByCompany[company.companyId];
      if (!selectedContactId) return null;
      return company.contacts.find((item) => item.id === selectedContactId) ?? null;
    })();

    const contactLine = contact
      ? `Contact: ${contact.name}${contact.designation ? ` (${contact.designation})` : ""}`
      : "Contact: Select HR/contact from company card";

    return [
      `Company: ${company.companyName}`,
      `Season: ${company.season.name}`,
      `Roles: ${roles}`,
      contactLine,
      company.notes ? `Notes: ${company.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function openTelegramModal(company: ConfirmedCompany) {
    setTelegramCompanyId(company.companyId);
    setTelegramTemplateId("");
    setTelegramModalOpen(true);

    setManualTelegramByCompany((prev) => {
      if (prev[company.companyId]?.trim()) return prev;
      return {
        ...prev,
        [company.companyId]: `${buildTelegramCompanyContext(company)}\n\n`,
      };
    });
  }

  function applyTelegramTemplate(templateId: string) {
    setTelegramTemplateId(templateId);

    if (!telegramCompany) return;
    const template = telegramTemplates.find((item) => item.id === templateId);
    if (!template) return;

    const candidate = template.bodyText?.trim() || htmlToText(template.bodyHtml);
    const companyContext = buildTelegramCompanyContext(telegramCompany);

    setManualTelegramByCompany((prev) => ({
      ...prev,
      [telegramCompany.companyId]: `${companyContext}\n\n${candidate}`,
    }));
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1">Select Session (Drive)</p>
            <FilterSelect
              value={selectedDrive}
              onChange={(value) => {
                void handleDriveChange(value);
              }}
              options={driveOptions}
              placeholder="Choose confirmed drive"
              className="w-full"
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1">Search Accepted Companies</p>
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Search company, role, notes"
              className="w-full"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Accepted In Selected Season</p>
              <p className="text-lg font-bold text-slate-900">{filteredCompanies.length}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
              <Building2 size={16} className="text-[#2563EB]" />
            </div>
          </div>
        </div>

        {actionError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 inline-flex items-center gap-2">
            <AlertCircle size={14} />
            {actionError}
          </div>
        ) : null}

        {actionMessage ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {actionMessage}
          </div>
        ) : null}
      </section>

      {loading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-600 inline-flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Loading confirmed data...
          </p>
        </section>
      ) : loadingError ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-700">{loadingError}</p>
        </section>
      ) : filteredCompanies.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white">
          <EmptyState
            icon={Search}
            title="No accepted companies found"
            description="Pick another confirmed drive or adjust your search."
          />
        </section>
      ) : (
        <section className="space-y-4">
          {filteredCompanies.map((company) => {
              const isActive = selectedCompanyId === company.companyId;
              const contactValue = selectedContactByCompany[company.companyId] ?? "";
              const slot1 = sheetOneByCompany[company.companyId] ?? null;
              const slot2 = sheetTwoByCompany[company.companyId] ?? null;
              const hasContacts = company.contacts.length > 0;
              const hasSelectedContact = Boolean(contactValue);

              return (
                <article
                  key={company.companySeasonCycleId}
                  onClick={() => setSelectedCompanyId(company.companyId)}
                  className={`rounded-2xl border bg-white p-4 md:p-5 transition-all ${
                    isActive
                      ? "border-[#2563EB] ring-2 ring-[#93C5FD] shadow-[0_8px_20px_rgba(37,99,235,0.12)]"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{company.companyName}</h2>
                      <p className="text-sm text-slate-600 mt-1">
                        Roles: {company.roles.length > 0 ? company.roles.join(", ") : "No role titles mapped"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success" size="sm" dot>
                        {company.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-sm text-slate-700">
                    <p>
                      <span className="font-semibold text-slate-900">Season:</span> {company.season.name}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Type:</span> {company.season.seasonType}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Contacts:</span> {company.contacts.length}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Notes:</span> {company.notes ?? "None"}
                    </p>
                  </div>

                  <div className="mt-3">
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">
                      Choose HR / Contact
                    </label>
                    <FilterSelect
                      value={contactValue}
                      onChange={(value) =>
                        setSelectedContactByCompany((prev) => ({
                          ...prev,
                          [company.companyId]: value,
                        }))
                      }
                      options={company.contacts.map((contact) => ({
                        value: contact.id,
                        label: contact.designation
                          ? `${contact.name} (${contact.designation})`
                          : contact.name,
                      }))}
                      placeholder="Select HR contact"
                    />
                    {!hasContacts ? (
                      <p className="mt-1 text-xs text-slate-500">
                        No contacts available. Contact-dependent actions are disabled.
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                    <button
                      type="button"
                      onClick={() => void logCall(company)}
                      disabled={submittingAction[`call:${company.companyId}`] || !hasSelectedContact}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2 text-sm font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <PhoneCall size={15} />
                      Call HR
                    </button>
                    <button
                      type="button"
                      onClick={() => openScheduleModal(company)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8] px-3 py-2 text-sm font-medium hover:bg-[#DBEAFE] transition-colors"
                    >
                      <CalendarPlus size={15} />
                      Schedule Event
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendMailRequest(company, "students")}
                      disabled={submittingAction[`mail:students:${company.companyId}`]}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 px-3 py-2 text-sm font-medium hover:bg-amber-100 transition-colors disabled:opacity-60"
                    >
                      <Users size={15} />
                      Request Mailing Team
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendMailRequest(company, "company")}
                      disabled={submittingAction[`mail:company:${company.companyId}`] || !hasSelectedContact}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 px-3 py-2 text-sm font-medium hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Mail size={15} />
                      Mail Company
                    </button>
                    <button
                      type="button"
                      onClick={() => openTelegramModal(company)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 px-3 py-2 text-sm font-medium hover:bg-indigo-100 transition-colors"
                    >
                      <Send size={15} />
                      Telegram
                    </button>
                  </div>

                  <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3">
                    <p className="text-xs font-semibold text-slate-700 mb-2">
                      Upload two files for this company (CSV/XLS/XLSX)
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <FileSpreadsheet size={15} className="text-[#2563EB]" />
                          <p className="text-sm font-semibold text-slate-800">Supsrset sheet</p>
                        </div>
                        <label className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors">
                          <Upload size={13} />
                          Choose CSV/XLSX
                          <input
                            type="file"
                            accept=".csv,.xls,.xlsx"
                            className="hidden"
                            onChange={(event) => void onUploadSheet(company.companyId, "sheetOne", event)}
                          />
                        </label>
                        <div className="mt-2">
                          <UploadedFileName
                            attachment={slot1}
                            uploading={Boolean(uploadingBySlot[`${company.companyId}:sheetOne`])}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => downloadPlaceholderComparison(company)}
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-xs font-semibold text-[#1D4ED8] hover:bg-[#DBEAFE]"
                        >
                          Compare
                        </button>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <FileSpreadsheet size={15} className="text-[#2563EB]" />
                          <p className="text-sm font-semibold text-slate-800">Acadly attendence</p>
                        </div>
                        <label className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors">
                          <Upload size={13} />
                          Choose CSV/XLSX
                          <input
                            type="file"
                            accept=".csv,.xls,.xlsx"
                            className="hidden"
                            onChange={(event) => void onUploadSheet(company.companyId, "sheetTwo", event)}
                          />
                        </label>
                        <div className="mt-2">
                          <UploadedFileName
                            attachment={slot2}
                            uploading={Boolean(uploadingBySlot[`${company.companyId}:sheetTwo`])}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
        </section>
      )}

      <Modal
        isOpen={telegramModalOpen}
        onClose={() => setTelegramModalOpen(false)}
        title={telegramCompany ? `Telegram - ${telegramCompany.companyName}` : "Telegram"}
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setTelegramModalOpen(false)}
            >
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setTelegramModalOpen(false);
                setActionMessage("Telegram draft saved for selected company.");
              }}
              disabled={!telegramCompany}
            >
              Save Draft
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1">Template</p>
            <FilterSelect
              value={telegramTemplateId}
              onChange={applyTelegramTemplate}
              options={templateOptions}
              placeholder="Select template"
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            <p className="font-semibold text-slate-800 mb-1">Company Context</p>
            {telegramCompany ? (
              <div className="space-y-0.5">
                <p>Company: {telegramCompany.companyName}</p>
                <p>Season: {telegramCompany.season.name}</p>
                <p>
                  Roles: {telegramCompany.roles.length > 0 ? telegramCompany.roles.join(", ") : "Not mapped"}
                </p>
                <p>Notes: {telegramCompany.notes ?? "None"}</p>
              </div>
            ) : (
              <p>No company selected.</p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            <p className="font-semibold text-slate-800 mb-1">Selected Contact</p>
            {telegramContact ? (
              <div className="space-y-0.5">
                <p>Name: {telegramContact.name}</p>
                <p>Designation: {telegramContact.designation ?? "Not available"}</p>
                <p>Phone: {telegramContact.phones[0] ?? "Not available"}</p>
                <p>Email: {telegramContact.emails[0] ?? "Not available"}</p>
              </div>
            ) : (
              <p>No contact selected.</p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1">Telegram Message</p>
            <textarea
              className="input-base min-h-52 resize-y"
              disabled={!telegramCompany}
              value={telegramCompany ? (manualTelegramByCompany[telegramCompany.companyId] ?? "") : ""}
              onChange={(event) => {
                if (!telegramCompany) return;
                const next = event.target.value;
                setManualTelegramByCompany((prev) => ({
                  ...prev,
                  [telegramCompany.companyId]: next,
                }));
              }}
              placeholder="Write telegram message here"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title="Schedule Event"
        size="md"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setScheduleModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void createSchedule()}
              disabled={submittingAction.schedule}
            >
              {submittingAction.schedule ? "Saving..." : "Create"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Title</span>
            <input
              className="input-base mt-1"
              value={scheduleForm.title}
              onChange={(event) =>
                setScheduleForm((prev) => ({
                  ...prev,
                  title: event.target.value,
                }))
              }
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Description</span>
            <textarea
              className="input-base mt-1 min-h-20 resize-y"
              value={scheduleForm.description}
              onChange={(event) =>
                setScheduleForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Start</span>
              <input
                type="datetime-local"
                className="input-base mt-1"
                value={scheduleForm.startTime}
                onChange={(event) =>
                  setScheduleForm((prev) => ({
                    ...prev,
                    startTime: event.target.value,
                  }))
                }
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">End</span>
              <input
                type="datetime-local"
                className="input-base mt-1"
                value={scheduleForm.endTime}
                onChange={(event) =>
                  setScheduleForm((prev) => ({
                    ...prev,
                    endTime: event.target.value,
                  }))
                }
              />
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
