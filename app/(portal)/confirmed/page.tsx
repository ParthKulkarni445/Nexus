"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  AlertCircle,
  Building2,
  CalendarPlus,
  Eye,
  FileSpreadsheet,
  Loader2,
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
  studentEntryNumbers: string[];
};

type UploadStudentInfoResponse = {
  companySeasonCycleId: string;
  uploadedCount: number;
  invalidRows: number[];
  sampleEntryNumbers: string[];
};

type AttendanceCompareRow = {
  entryNumber: string;
  attendanceStatus: string;
  matched: boolean;
};

type CompareAttendanceResponse = {
  companySeasonCycleId: string;
  detectedAttendanceColumn: string;
  matchedCount: number;
  missingCount: number;
  uploadedCount: number;
  rows: AttendanceCompareRow[];
  unmatchedAttendanceEntries: string[];
};

type ConfirmedPayload = {
  drives: ConfirmedDrive[];
  selectedDriveId: string | null;
  acceptedCompanies: ConfirmedCompany[];
  telegramTemplates: TelegramTemplate[];
};

type MePayload = {
  user: {
    email?: string | null;
  };
};

type InstructionTask = "upload" | "compare";

type StudentUploadPreview = {
  companyId: string;
  companySeasonCycleId: string;
  companyName: string;
  file: File;
  rollHeader: string;
  validEntries: string[];
  invalidRows: number[];
  totalDataRows: number;
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

function toGoogleDateTime(value: string) {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeEntryNumber(rawValue: string) {
  const compact = rawValue.trim().toUpperCase().replace(/\s+/g, "");
  if (!compact) return null;
  return /^\d{4}[A-Z]{3}\d{4}$/.test(compact) ? compact : null;
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
  const [studentPreviewCompanyId, setStudentPreviewCompanyId] = useState("");
  const [instructionModalTask, setInstructionModalTask] = useState<InstructionTask | null>(null);
  const [instructionModalCompanyId, setInstructionModalCompanyId] = useState("");
  const [compareResultModalOpen, setCompareResultModalOpen] = useState(false);
  const [compareResultCompanyId, setCompareResultCompanyId] = useState("");
  const [compareResultCompanyName, setCompareResultCompanyName] = useState("");
  const [compareResultPayload, setCompareResultPayload] = useState<CompareAttendanceResponse | null>(null);
  const [studentUploadPreview, setStudentUploadPreview] = useState<StudentUploadPreview | null>(null);

  const [uploadingStudentByCompany, setUploadingStudentByCompany] = useState<Record<string, boolean>>({});
  const [comparingAttendanceByCompany, setComparingAttendanceByCompany] = useState<
    Record<string, boolean>
  >({});

  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [submittingAction, setSubmittingAction] = useState<Record<string, boolean>>({});
  const [loggedInUserEmail, setLoggedInUserEmail] = useState("");

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

  useEffect(() => {
    void (async () => {
      try {
        const payload = await requestJson<MePayload>("/api/v1/auth/me");
        setLoggedInUserEmail(payload.user.email?.trim() ?? "");
      } catch {
        setLoggedInUserEmail("");
      }
    })();
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

  const studentPreviewCompany = useMemo(
    () => acceptedCompanies.find((company) => company.companyId === studentPreviewCompanyId) ?? null,
    [acceptedCompanies, studentPreviewCompanyId],
  );

  const instructionModalCompany = useMemo(
    () => acceptedCompanies.find((company) => company.companyId === instructionModalCompanyId) ?? null,
    [acceptedCompanies, instructionModalCompanyId],
  );

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

  function downloadAttendanceComparison(company: ConfirmedCompany, payload: CompareAttendanceResponse) {
    const rows = [
      "entry_number,attendance_status,matched",
      ...payload.rows.map(
        (row) => `${row.entryNumber},${JSON.stringify(row.attendanceStatus)},${row.matched ? "yes" : "no"}`,
      ),
    ];

    if (payload.unmatchedAttendanceEntries.length > 0) {
      rows.push("", "attendance_entries_not_in_uploaded_list");
      rows.push(...payload.unmatchedAttendanceEntries);
    }

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${company.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-attendance-comparison.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function onUploadStudentInfo(company: ConfirmedCompany, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    event.target.value = "";
    setActionError("");
    setActionMessage("");

    try {
      const xlsx = await import("xlsx");
      const workbook = xlsx.read(await file.arrayBuffer(), { type: "array" });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error("Uploaded file is empty.");
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rows = xlsx.utils.sheet_to_json<string[]>(worksheet, {
        header: 1,
        blankrows: false,
        defval: "",
        raw: false,
      });

      if (rows.length === 0) {
        throw new Error("Uploaded file is empty.");
      }

      const headers = rows[0].map((header, index) => {
        const trimmed = String(header).trim();
        return index === 0 ? trimmed.replace(/^\ufeff/, "") : trimmed;
      });

      const rollHeader = headers.find((header) => normalizeHeader(header) === "roll no");

      if (!rollHeader) {
        throw new Error("Missing required column 'Roll No'.");
      }

      const rollIndex = headers.findIndex((header) => header === rollHeader);
      const validEntrySet = new Set<string>();
      const invalidRows: number[] = [];

      for (let i = 1; i < rows.length; i += 1) {
        const value = String(rows[i]?.[rollIndex] ?? "").trim();
        if (!value) continue;
        const normalized = normalizeEntryNumber(value);
        if (!normalized) {
          invalidRows.push(i + 1);
          continue;
        }
        validEntrySet.add(normalized);
      }

      const validEntries = Array.from(validEntrySet).sort((a, b) => a.localeCompare(b));
      if (validEntries.length === 0) {
        throw new Error("No valid Roll No values found in YYYYBBBNNNN format.");
      }

      setStudentUploadPreview({
        companyId: company.companyId,
        companySeasonCycleId: company.companySeasonCycleId,
        companyName: company.companyName,
        file,
        rollHeader,
        validEntries,
        invalidRows,
        totalDataRows: Math.max(rows.length - 1, 0),
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to preview student file");
    }
  }

  async function submitStudentUploadPreview() {
    if (!studentUploadPreview) return;

    const company = acceptedCompanies.find((item) => item.companyId === studentUploadPreview.companyId);
    if (!company) {
      setActionError("Selected company was not found for upload.");
      return;
    }

    setUploadingStudentByCompany((prev) => ({ ...prev, [company.companyId]: true }));
    setActionError("");
    setActionMessage("");

    try {
      const formData = new FormData();
      formData.append("file", studentUploadPreview.file);
      formData.append("companySeasonCycleId", company.companySeasonCycleId);

      const payload = await requestJson<UploadStudentInfoResponse>("/api/v1/confirmed/student-info", {
        method: "POST",
        body: formData,
      });

      await fetchConfirmedData(selectedDrive || undefined);
      setActionMessage(
        `Uploaded ${payload.uploadedCount} entry numbers for ${company.companyName}` +
          (payload.invalidRows.length > 0
            ? ` (ignored invalid rows: ${payload.invalidRows.slice(0, 5).join(", ")}${payload.invalidRows.length > 5 ? ", ..." : ""})`
            : ""),
      );
      setStudentUploadPreview(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Student info upload failed");
    } finally {
      setUploadingStudentByCompany((prev) => ({ ...prev, [company.companyId]: false }));
    }
  }

  async function onCompareAttendance(company: ConfirmedCompany, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    setComparingAttendanceByCompany((prev) => ({ ...prev, [company.companyId]: true }));
    setActionError("");
    setActionMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("companySeasonCycleId", company.companySeasonCycleId);

      const payload = await requestJson<CompareAttendanceResponse>(
        "/api/v1/confirmed/compare-attendance",
        {
          method: "POST",
          body: formData,
        },
      );

      setCompareResultCompanyId(company.companyId);
      setCompareResultCompanyName(company.companyName);
      setCompareResultPayload(payload);
      setCompareResultModalOpen(true);
      setActionMessage(
        `Attendance compared for ${company.companyName}: ${payload.matchedCount} matched, ${payload.missingCount} missing.`,
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Attendance comparison failed");
    } finally {
      setComparingAttendanceByCompany((prev) => ({ ...prev, [company.companyId]: false }));
      event.target.value = "";
    }
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
    const selectedContactId = selectedContactByCompany[company.companyId];
    const selectedContact =
      company.contacts.find((contact) => contact.id === selectedContactId) ?? null;

    const title = `${company.companyName} - OA`;
    const details = [
      `Company: ${company.companyName}`,
      `Season: ${company.season.name}`,
      company.roles.length > 0 ? `Roles: ${company.roles.join(", ")}` : "",
      company.notes ? `Notes: ${company.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: title,
      details,
      sf: "true",
      output: "xml",
    });

    const invitees = Array.from(
      new Set([
        ...(selectedContact?.emails ?? []),
        loggedInUserEmail,
        ...company.studentEntryNumbers.map((entry) => `${entry}@iitrpr.ac.in`),
      ]),
    )
      .map((email) => email.trim())
      .filter(Boolean);

    if (invitees.length > 0) {
      params.set("add", invitees.join(","));
    }

    const driveForCompany = drives.find(
      (drive) => drive.id === selectedDrive && drive.companyId === company.companyId,
    );

    if (driveForCompany?.startAt && driveForCompany?.endAt) {
      params.set(
        "dates",
        `${toGoogleDateTime(driveForCompany.startAt)}/${toGoogleDateTime(
          driveForCompany.endAt,
        )}`,
      );
    }

    const url = `https://calendar.google.com/calendar/render?${params.toString()}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setActionError("");
    setActionMessage("Opened Google Calendar with prefilled event.");
  }

  async function sendMailRequest(company: ConfirmedCompany) {
    const actionKey = `mail:students:${company.companyId}`;
    setSubmittingAction((prev) => ({ ...prev, [actionKey]: true }));
    setActionError("");
    setActionMessage("");

    try {
      const body = (manualTelegramByCompany[company.companyId] ?? "").trim();

      await requestJson("/api/v1/mail/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.companyId,
          companySeasonCycleId: company.companySeasonCycleId,
          requestType: "custom",
          customSubject: `${company.companyName} update for students`,
          customBody: body || undefined,
          recipientFilter: { audience: "all_students", source: "confirmed_tab" },
          previewPayload: {
            source: "confirmed_tab",
            mode: "students",
            companyName: company.companyName,
            contactName: null,
          },
          attachments: [],
          urgency: 3,
        }),
      });

      setActionMessage("Mailing request queued for students.");
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

  function triggerFilePicker(inputId: string) {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    input?.click();
  }

  function openInstructionModal(company: ConfirmedCompany, task: InstructionTask) {
    setInstructionModalCompanyId(company.companyId);
    setInstructionModalTask(task);
  }

  function closeInstructionModal() {
    setInstructionModalTask(null);
    setInstructionModalCompanyId("");
  }

  function downloadTemplateCsv(task: InstructionTask) {
    const csv =
      task === "upload"
        ? [
            "Roll No,Student Name,Any Other Column",
            "2025CSE0123,Example Student,Optional value",
          ].join("\n")
        : [
            "Student Email,Status,Optional Column",
            "2025CSE0123@iitrpr.ac.in,Present,Optional value",
          ].join("\n");

    const fileName =
      task === "upload"
        ? "student-upload-template.csv"
        : "attendance-compare-template.csv";

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  function continueFromInstruction() {
    if (!instructionModalCompanyId || !instructionModalTask) return;

    const inputId =
      instructionModalTask === "upload"
        ? `upload-students-${instructionModalCompanyId}`
        : `compare-attendance-${instructionModalCompanyId}`;

    closeInstructionModal();
    triggerFilePicker(inputId);
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
              const hasContacts = company.contacts.length > 0;
              const hasSelectedContact = Boolean(contactValue);
              const hasUploadedStudents = company.studentEntryNumbers.length > 0;

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

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
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
                      disabled={!hasUploadedStudents}
                      title={
                        hasUploadedStudents
                          ? "Schedule event with participants"
                          : "Upload students first to enable scheduling"
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8] px-3 py-2 text-sm font-medium hover:bg-[#DBEAFE] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CalendarPlus size={15} />
                      Schedule Event
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendMailRequest(company)}
                      disabled={submittingAction[`mail:students:${company.companyId}`]}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 px-3 py-2 text-sm font-medium hover:bg-amber-100 transition-colors disabled:opacity-60"
                    >
                      <Users size={15} />
                      Request Mailing Team
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
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-700">
                        Students Uploaded: <span className="text-slate-900">{company.studentEntryNumbers.length}</span>
                      </p>
                      <p className="text-xs text-slate-500">Format: YYYYBBBNNNN</p>
                    </div>

                    <input
                      id={`upload-students-${company.companyId}`}
                      type="file"
                      accept=".csv,.xls,.xlsx"
                      className="hidden"
                      onChange={(event) => void onUploadStudentInfo(company, event)}
                      disabled={Boolean(uploadingStudentByCompany[company.companyId])}
                    />
                    <input
                      id={`compare-attendance-${company.companyId}`}
                      type="file"
                      accept=".csv,.xls,.xlsx"
                      className="hidden"
                      onChange={(event) => void onCompareAttendance(company, event)}
                      disabled={Boolean(comparingAttendanceByCompany[company.companyId])}
                    />

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openInstructionModal(company, "upload")}
                        disabled={Boolean(uploadingStudentByCompany[company.companyId])}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Upload size={12} />
                        {uploadingStudentByCompany[company.companyId] ? "Uploading..." : "Upload Students"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setStudentPreviewCompanyId(company.companyId)}
                        disabled={!hasUploadedStudents}
                        title={
                          hasUploadedStudents
                            ? "Preview uploaded students"
                            : "Upload students first to preview the list"
                        }
                        className="inline-flex items-center gap-1.5 rounded-md border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-1.5 text-xs font-semibold text-[#1D4ED8] hover:bg-[#DBEAFE] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Eye size={12} />
                        Preview List
                      </button>

                      <button
                        type="button"
                        onClick={() => openInstructionModal(company, "compare")}
                        disabled={Boolean(comparingAttendanceByCompany[company.companyId]) || !hasUploadedStudents}
                        title={
                          hasUploadedStudents
                            ? "Compare attendance"
                            : "Upload students first to enable compare attendance"
                        }
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FileSpreadsheet size={12} />
                        {comparingAttendanceByCompany[company.companyId] ? "Comparing..." : "Compare Attendance"}
                      </button>
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
        isOpen={Boolean(studentPreviewCompany)}
        onClose={() => setStudentPreviewCompanyId("")}
        title={studentPreviewCompany ? `Students - ${studentPreviewCompany.companyName}` : "Students"}
        size="lg"
        footer={
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setStudentPreviewCompanyId("")}
          >
            Close
          </button>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Uploaded students: <span className="font-semibold text-slate-800">{studentPreviewCompany?.studentEntryNumbers.length ?? 0}</span>
          </p>

          {studentPreviewCompany && studentPreviewCompany.studentEntryNumbers.length > 0 ? (
            <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Entry Number</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {studentPreviewCompany.studentEntryNumbers.map((entry, index) => (
                    <tr key={entry} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-2 text-slate-600">{index + 1}</td>
                      <td className="px-3 py-2 font-medium text-slate-900">{entry}</td>
                      <td className="px-3 py-2 text-slate-700">{entry}@iitrpr.ac.in</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No students uploaded yet for this company.</p>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(instructionModalTask && instructionModalCompany)}
        onClose={closeInstructionModal}
        title={
          instructionModalTask === "upload"
            ? `Upload Students Instructions - ${instructionModalCompany?.companyName ?? ""}`
            : `Compare Attendance Instructions - ${instructionModalCompany?.companyName ?? ""}`
        }
        size="md"
        footer={
          <>
            <button type="button" className="btn btn-secondary btn-sm" onClick={closeInstructionModal}>
              Cancel
            </button>
            {instructionModalTask === "upload" ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  downloadTemplateCsv("upload");
                }}
              >
                Download Template
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={continueFromInstruction}
              disabled={!instructionModalTask || !instructionModalCompany}
            >
              Continue
            </button>
          </>
        }
      >
        {instructionModalTask === "upload" ? (
          <div className="space-y-2 text-sm text-slate-700">
            <p>
              File can have <span className="font-semibold">any number of columns</span>.
            </p>
            <p>
              One required column must be exactly: <span className="font-semibold">Roll No</span>.
            </p>
            <p>
              Roll No format must be: <span className="font-semibold">YYYYBBBNNNN</span> (example: 2025CSE0123).
            </p>
          </div>
        ) : instructionModalTask === "compare" ? (
          <div className="space-y-2 text-sm text-slate-700">
            <p>
              Upload <span className="font-semibold">CSV exported from Acadly</span>.
            </p>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={compareResultModalOpen}
        onClose={() => setCompareResultModalOpen(false)}
        title={compareResultCompanyName ? `Attendance Records - ${compareResultCompanyName}` : "Attendance Records"}
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setCompareResultModalOpen(false)}
            >
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                const company = acceptedCompanies.find((item) => item.companyId === compareResultCompanyId);
                if (!company || !compareResultPayload) return;
                downloadAttendanceComparison(company, compareResultPayload);
              }}
              disabled={!compareResultPayload}
            >
              Download CSV
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {compareResultPayload ? (
            <>
              <p className="text-xs text-slate-600">
                Matched: <span className="font-semibold text-emerald-700">{compareResultPayload.matchedCount}</span>
                {" "}| Missing: <span className="font-semibold text-rose-700">{compareResultPayload.missingCount}</span>
              </p>

              <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">#</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Entry Number</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Status</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Matched</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareResultPayload.rows.map((row, index) => (
                      <tr key={`${row.entryNumber}-${index}`} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-3 py-2 text-slate-600">{index + 1}</td>
                        <td className="px-3 py-2 font-medium text-slate-900">{row.entryNumber}</td>
                        <td className="px-3 py-2 text-slate-700">{row.attendanceStatus}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${
                              row.matched
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {row.matched ? "Yes" : "No"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">No records to display.</p>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(studentUploadPreview)}
        onClose={() => {
          const companyId = studentUploadPreview?.companyId ?? "";
          if (companyId && uploadingStudentByCompany[companyId]) {
            return;
          }
          setStudentUploadPreview(null);
        }}
        title={
          studentUploadPreview
            ? `Preview Student Upload - ${studentUploadPreview.companyName}`
            : "Preview Student Upload"
        }
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setStudentUploadPreview(null)}
              disabled={Boolean(
                studentUploadPreview && uploadingStudentByCompany[studentUploadPreview.companyId],
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void submitStudentUploadPreview()}
              disabled={Boolean(
                !studentUploadPreview ||
                  (studentUploadPreview && uploadingStudentByCompany[studentUploadPreview.companyId]),
              )}
            >
              {studentUploadPreview && uploadingStudentByCompany[studentUploadPreview.companyId]
                ? "Uploading..."
                : "Confirm Upload"}
            </button>
          </>
        }
      >
        {studentUploadPreview ? (
          <div className="space-y-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <p>
                File: <span className="font-semibold">{studentUploadPreview.file.name}</span>
              </p>
              <p>
                Detected column: <span className="font-semibold">{studentUploadPreview.rollHeader}</span>
              </p>
              <p>
                Valid entries: <span className="font-semibold text-emerald-700">{studentUploadPreview.validEntries.length}</span>
                {" "}| Invalid rows: <span className="font-semibold text-rose-700">{studentUploadPreview.invalidRows.length}</span>
                {" "}| Data rows: <span className="font-semibold">{studentUploadPreview.totalDataRows}</span>
              </p>
            </div>

            <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Entry Number</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {studentUploadPreview.validEntries.slice(0, 200).map((entry, index) => (
                    <tr key={entry} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-2 text-slate-600">{index + 1}</td>
                      <td className="px-3 py-2 font-medium text-slate-900">{entry}</td>
                      <td className="px-3 py-2 text-slate-700">{entry}@iitrpr.ac.in</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {studentUploadPreview.validEntries.length > 200 ? (
              <p className="text-xs text-slate-500">
                Showing first 200 entries in preview. All valid entries will be uploaded.
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>

    </div>
  );
}
