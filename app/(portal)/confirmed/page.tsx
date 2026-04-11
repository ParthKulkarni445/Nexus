"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  AlertCircle,
  Building2,
  CalendarPlus,
  ChevronDown,
  Eye,
  FileSpreadsheet,
  Loader2,
  Pencil,
  PhoneCall,
  Search,
  Send,
  Upload,
  Users,
  X,
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
  drives: Array<{
    id: string;
    title: string;
    compensationAmount: number | null;
    studentEntryNumbers: string[];
  }>;
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
  driveId: string;
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
  driveId: string;
  detectedAttendanceColumn: string;
  matchedCount: number;
  missingCount: number;
  uploadedCount: number;
  rows: AttendanceCompareRow[];
  unmatchedAttendanceEntries: string[];
};

type ConfirmedPayload = {
  acceptedCompanies: ConfirmedCompany[];
  telegramTemplates: TelegramTemplate[];
};

type SeasonRecord = {
  id: string;
  name: string;
  seasonType: "intern" | "placement";
  academicYear: string;
  isActive: boolean;
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
  driveId: string;
  driveTitle: string;
  companyName: string;
  file: File;
  rollHeader: string;
  validEntries: string[];
  invalidRows: number[];
  totalDataRows: number;
};

type ActionFlushbar = {
  id: number;
  tone: "warning" | "error";
  message: string;
  progress: number;
};

const WARNING_FLUSHBAR_DURATION_MS = 3500;

function htmlToText(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
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

function ConfirmedToolbarSkeleton() {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.1fr_1.1fr_0.8fr]">
        <div className="space-y-2">
          <div className="shimmer h-3 w-24 rounded-full" />
          <div className="shimmer h-11 rounded-2xl" />
        </div>
        <div className="space-y-2">
          <div className="shimmer h-3 w-36 rounded-full" />
          <div className="shimmer h-11 rounded-2xl" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="shimmer h-3 w-28 rounded-full" />
          <div className="mt-3 shimmer h-8 w-16 rounded-full" />
        </div>
      </div>
    </section>
  );
}

function ConfirmedCompanyCardSkeleton() {
  return (
    <article className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="shimmer h-6 w-48 rounded-full" />
            <div className="shimmer h-4 w-64 rounded-full" />
          </div>
          <div className="shimmer h-7 w-20 rounded-full" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="shimmer h-16 rounded-2xl" />
          <div className="shimmer h-16 rounded-2xl" />
          <div className="shimmer h-16 rounded-2xl" />
          <div className="shimmer h-16 rounded-2xl" />
        </div>
        <div className="space-y-2">
          <div className="shimmer h-3 w-24 rounded-full" />
          <div className="shimmer h-10 rounded-xl" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="shimmer h-10 rounded-xl" />
          <div className="shimmer h-10 rounded-xl" />
          <div className="shimmer h-10 rounded-xl" />
          <div className="shimmer h-10 rounded-xl" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="shimmer h-3 w-32 rounded-full" />
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="shimmer h-8 rounded-xl" />
            <div className="shimmer h-8 rounded-xl" />
            <div className="shimmer h-8 rounded-xl" />
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ConfirmedPage() {
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const [seasons, setSeasons] = useState<SeasonRecord[]>([]);
  const [acceptedCompanies, setAcceptedCompanies] = useState<
    ConfirmedCompany[]
  >([]);
  const [telegramTemplates, setTelegramTemplates] = useState<
    TelegramTemplate[]
  >([]);

  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [query, setQuery] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [stipendDraftByDrive, setStipendDraftByDrive] = useState<
    Record<string, string>
  >({});
  const [editingStipendByDrive, setEditingStipendByDrive] = useState<
    Record<string, boolean>
  >({});
  const [savingStipendByDrive, setSavingStipendByDrive] = useState<
    Record<string, boolean>
  >({});
  const [manualTelegramByCompany, setManualTelegramByCompany] = useState<
    Record<string, string>
  >({});
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);
  const [telegramCompanyId, setTelegramCompanyId] = useState("");
  const [telegramTemplateId, setTelegramTemplateId] = useState("");
  const [studentPreviewDrive, setStudentPreviewDrive] = useState<{
    companyId: string;
    driveId: string;
  } | null>(null);
  const [instructionModalTask, setInstructionModalTask] =
    useState<InstructionTask | null>(null);
  const [instructionModalCompanyId, setInstructionModalCompanyId] =
    useState("");
  const [instructionModalDriveId, setInstructionModalDriveId] = useState("");
  const [compareResultModalOpen, setCompareResultModalOpen] = useState(false);
  const [compareResultCompanyId, setCompareResultCompanyId] = useState("");
  const [compareResultCompanyName, setCompareResultCompanyName] = useState("");
  const [compareResultDriveTitle, setCompareResultDriveTitle] = useState("");
  const [compareResultPayload, setCompareResultPayload] =
    useState<CompareAttendanceResponse | null>(null);
  const [studentUploadPreview, setStudentUploadPreview] =
    useState<StudentUploadPreview | null>(null);

  const [uploadingStudentByDrive, setUploadingStudentByDrive] = useState<
    Record<string, boolean>
  >({});
  const [comparingAttendanceByDrive, setComparingAttendanceByDrive] = useState<
    Record<string, boolean>
  >({});

  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionFlushbar, setActionFlushbar] = useState<ActionFlushbar | null>(
    null,
  );
  const [submittingAction, setSubmittingAction] = useState<
    Record<string, boolean>
  >({});
  const [loggedInUserEmail, setLoggedInUserEmail] = useState("");
  const actionFlushbarProgressTimerRef = useRef<number | null>(null);
  const actionFlushbarHideTimerRef = useRef<number | null>(null);

  function clearActionFlushbarTimers() {
    if (actionFlushbarProgressTimerRef.current !== null) {
      window.clearTimeout(actionFlushbarProgressTimerRef.current);
      actionFlushbarProgressTimerRef.current = null;
    }

    if (actionFlushbarHideTimerRef.current !== null) {
      window.clearTimeout(actionFlushbarHideTimerRef.current);
      actionFlushbarHideTimerRef.current = null;
    }
  }

  function dismissActionFlushbar() {
    clearActionFlushbarTimers();
    setActionFlushbar(null);
  }

  function showActionFlushbar(tone: "warning" | "error", message: string) {
    dismissActionFlushbar();
    setActionMessage("");

    const id = Date.now();
    setActionFlushbar({ id, tone, message, progress: 100 });

    actionFlushbarProgressTimerRef.current = window.setTimeout(() => {
      setActionFlushbar((current) =>
        current?.id === id ? { ...current, progress: 0 } : current,
      );
    }, 30);

    actionFlushbarHideTimerRef.current = window.setTimeout(() => {
      setActionFlushbar((current) => (current?.id === id ? null : current));
    }, WARNING_FLUSHBAR_DURATION_MS + 30);
  }

  function showActionWarning(message: string) {
    showActionFlushbar("warning", message);
  }

  function showActionError(message: string) {
    showActionFlushbar("error", message);
  }

  useEffect(() => {
    if (!actionError.trim()) {
      return;
    }

    showActionError(actionError);
    setActionError("");
  }, [actionError]);

  useEffect(() => {
    return () => {
      clearActionFlushbarTimers();
    };
  }, []);

  async function fetchConfirmedData(nextSeasonId?: string) {
    setLoading(true);
    setLoadingError(null);

    try {
      const params = new URLSearchParams();
      if (nextSeasonId) {
        params.set("seasonId", nextSeasonId);
      }

      const search = params.toString();
      const payload = await requestJson<ConfirmedPayload>(
        `/api/v1/confirmed${search ? `?${search}` : ""}`,
      );

      setAcceptedCompanies(payload.acceptedCompanies);
      setTelegramTemplates(payload.telegramTemplates);
      setStipendDraftByDrive((current) => {
        const next = { ...current };
        for (const company of payload.acceptedCompanies) {
          for (const drive of company.drives) {
            if (!next[drive.id]) {
              next[drive.id] =
                drive.compensationAmount !== null
                  ? String(drive.compensationAmount)
                  : "";
            }
          }
        }
        return next;
      });
      setSelectedSeasonId((current) => {
        if (nextSeasonId) {
          return nextSeasonId;
        }

        return current;
      });
      setSelectedCompanyId("");
      setTelegramCompanyId("");
      setTelegramTemplateId("");
    } catch (error) {
      setLoadingError(
        error instanceof Error
          ? error.message
          : "Unable to load confirmed data",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        const seasonList = await requestJson<SeasonRecord[]>("/api/v1/seasons");
        setSeasons(seasonList);
        const defaultSeasonId =
          seasonList.find((season) => season.isActive)?.id ?? seasonList[0]?.id;

        if (defaultSeasonId) {
          void fetchConfirmedData(defaultSeasonId);
        } else {
          setLoading(false);
        }
      } catch {
        setSeasons([]);
        setLoading(false);
      }
    })();
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
    () =>
      filteredCompanies.find(
        (company) => company.companyId === telegramCompanyId,
      ) ?? null,
    [filteredCompanies, telegramCompanyId],
  );

  const telegramContact = useMemo(() => {
    if (!telegramCompany) return null;
    return telegramCompany.contacts[0] ?? null;
  }, [telegramCompany]);

  const studentPreviewCompany = useMemo(
    () =>
      acceptedCompanies.find(
        (company) =>
          company.companyId === (studentPreviewDrive?.companyId ?? ""),
      ) ?? null,
    [acceptedCompanies, studentPreviewDrive],
  );

  const studentPreviewDriveItem = useMemo(
    () =>
      studentPreviewCompany?.drives.find(
        (drive) => drive.id === (studentPreviewDrive?.driveId ?? ""),
      ) ?? null,
    [studentPreviewCompany, studentPreviewDrive],
  );

  const instructionModalCompany = useMemo(
    () =>
      acceptedCompanies.find(
        (company) => company.companyId === instructionModalCompanyId,
      ) ?? null,
    [acceptedCompanies, instructionModalCompanyId],
  );

  const instructionModalDrive = useMemo(
    () =>
      instructionModalCompany?.drives.find(
        (drive) => drive.id === instructionModalDriveId,
      ) ?? null,
    [instructionModalCompany, instructionModalDriveId],
  );

  const seasonOptions = useMemo(
    () =>
      seasons.map((season) => ({
        value: season.id,
        label: `${season.name} (${season.academicYear})`,
      })),
    [seasons],
  );

  const templateOptions = telegramTemplates.map((template) => ({
    value: template.id,
    label: template.name,
  }));

  async function handleSeasonChange(nextSeasonId: string) {
    setSelectedSeasonId(nextSeasonId);
    await fetchConfirmedData(nextSeasonId);
  }

  function downloadAttendanceComparison(
    company: ConfirmedCompany,
    payload: CompareAttendanceResponse,
  ) {
    const rows = [
      "entry_number,attendance_status,matched",
      ...payload.rows.map(
        (row) =>
          `${row.entryNumber},${JSON.stringify(row.attendanceStatus)},${row.matched ? "yes" : "no"}`,
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

  async function onUploadStudentInfo(
    company: ConfirmedCompany,
    drive: ConfirmedCompany["drives"][number],
    event: ChangeEvent<HTMLInputElement>,
  ) {
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

      const rollHeader = headers.find(
        (header) => normalizeHeader(header) === "roll no",
      );

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

      const validEntries = Array.from(validEntrySet).sort((a, b) =>
        a.localeCompare(b),
      );
      if (validEntries.length === 0) {
        throw new Error("No valid Roll No values found.");
      }

      setStudentUploadPreview({
        companyId: company.companyId,
        companySeasonCycleId: company.companySeasonCycleId,
        driveId: drive.id,
        driveTitle: drive.title,
        companyName: company.companyName,
        file,
        rollHeader,
        validEntries,
        invalidRows,
        totalDataRows: Math.max(rows.length - 1, 0),
      });
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to preview student file",
      );
    }
  }

  async function submitStudentUploadPreview() {
    if (!studentUploadPreview) return;

    const company = acceptedCompanies.find(
      (item) => item.companyId === studentUploadPreview.companyId,
    );
    if (!company) {
      setActionError("Selected company was not found for upload.");
      return;
    }

    setUploadingStudentByDrive((prev) => ({
      ...prev,
      [studentUploadPreview.driveId]: true,
    }));
    setActionError("");
    setActionMessage("");

    try {
      const formData = new FormData();
      formData.append("file", studentUploadPreview.file);
      formData.append("companySeasonCycleId", company.companySeasonCycleId);
      formData.append("driveId", studentUploadPreview.driveId);

      const payload = await requestJson<UploadStudentInfoResponse>(
        "/api/v1/confirmed/student-info",
        {
          method: "POST",
          body: formData,
        },
      );

      await fetchConfirmedData(selectedSeasonId || undefined);
      setActionMessage(
        `Uploaded ${payload.uploadedCount} entry numbers for ${company.companyName} - ${studentUploadPreview.driveTitle}` +
          (payload.invalidRows.length > 0
            ? ` (ignored invalid rows: ${payload.invalidRows.slice(0, 5).join(", ")}${payload.invalidRows.length > 5 ? ", ..." : ""})`
            : ""),
      );
      setStudentUploadPreview(null);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Student info upload failed",
      );
    } finally {
      setUploadingStudentByDrive((prev) => ({
        ...prev,
        [studentUploadPreview.driveId]: false,
      }));
    }
  }

  async function onCompareAttendance(
    company: ConfirmedCompany,
    drive: ConfirmedCompany["drives"][number],
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    setComparingAttendanceByDrive((prev) => ({
      ...prev,
      [drive.id]: true,
    }));
    setActionError("");
    setActionMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("companySeasonCycleId", company.companySeasonCycleId);
      formData.append("driveId", drive.id);

      const payload = await requestJson<CompareAttendanceResponse>(
        "/api/v1/confirmed/compare-attendance",
        {
          method: "POST",
          body: formData,
        },
      );

      setCompareResultCompanyId(company.companyId);
      setCompareResultCompanyName(company.companyName);
      setCompareResultDriveTitle(drive.title);
      setCompareResultPayload(payload);
      setCompareResultModalOpen(true);
      setActionMessage(
        `Attendance compared for ${company.companyName} - ${drive.title}: ${payload.matchedCount} matched, ${payload.missingCount} missing.`,
      );
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Attendance comparison failed",
      );
    } finally {
      setComparingAttendanceByDrive((prev) => ({
        ...prev,
        [drive.id]: false,
      }));
      event.target.value = "";
    }
  }

  async function logCall(company: ConfirmedCompany) {
    const actionKey = `call:${company.companyId}`;
    const contactId = company.contacts[0]?.id;

    if (!contactId) {
      setActionError("No contact available for this company.");
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
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to log call interaction",
      );
    } finally {
      setSubmittingAction((prev) => ({ ...prev, [actionKey]: false }));
    }
  }

  async function saveDriveCompensation(
    company: ConfirmedCompany,
    drive: ConfirmedCompany["drives"][number],
  ) {
    const draft = stipendDraftByDrive[drive.id] ?? "";
    const nextValue = draft.trim() ? Number(draft) : null;

    if (nextValue !== null && (!Number.isFinite(nextValue) || nextValue < 0)) {
      setActionError("Compensation value must be a valid non-negative number.");
      return false;
    }

    setSavingStipendByDrive((prev) => ({ ...prev, [drive.id]: true }));
    setActionError("");
    setActionMessage("");

    try {
      await requestJson(`/api/v1/drives/${drive.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compensationAmount: nextValue ?? undefined }),
      });

      await fetchConfirmedData(selectedSeasonId || undefined);
      setActionMessage(
        `Updated compensation for ${company.companyName} - ${drive.title}.`,
      );
      return true;
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to update compensation",
      );
      return false;
    } finally {
      setSavingStipendByDrive((prev) => ({ ...prev, [drive.id]: false }));
    }
  }

  function openScheduleModal(company: ConfirmedCompany) {
    const selectedContact = company.contacts[0] ?? null;

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
          recipientFilter: {
            audience: "all_students",
            source: "confirmed_tab",
          },
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
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to create mail request",
      );
    } finally {
      setSubmittingAction((prev) => ({ ...prev, [actionKey]: false }));
    }
  }

  function buildTelegramCompanyContext(company: ConfirmedCompany) {
    const roles = company.roles.length
      ? company.roles.join(", ")
      : "Not mapped";
    const contact = company.contacts[0] ?? null;

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

    const candidate =
      template.bodyText?.trim() || htmlToText(template.bodyHtml);
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

  function openInstructionModal(
    company: ConfirmedCompany,
    drive: ConfirmedCompany["drives"][number],
    task: InstructionTask,
  ) {
    setInstructionModalCompanyId(company.companyId);
    setInstructionModalDriveId(drive.id);
    setInstructionModalTask(task);
  }

  function closeInstructionModal() {
    setInstructionModalTask(null);
    setInstructionModalCompanyId("");
    setInstructionModalDriveId("");
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
    if (
      !instructionModalCompanyId ||
      !instructionModalDriveId ||
      !instructionModalTask
    )
      return;

    const inputId =
      instructionModalTask === "upload"
        ? `upload-students-${instructionModalDriveId}`
        : `compare-attendance-${instructionModalDriveId}`;

    closeInstructionModal();
    triggerFilePicker(inputId);
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      {actionFlushbar ? (
        <div className="flushbar-stack fixed left-4 bottom-4 z-50 w-[min(92vw,380px)] pointer-events-none">
          <div
            className={`flushbar flushbar-${actionFlushbar.tone} overflow-hidden rounded-xl border shadow-lg`}
          >
            <div className="flushbar-progress-track h-1 w-full">
              <div
                className="flushbar-progress h-full transition-[width] ease-linear"
                style={{
                  width: `${actionFlushbar.progress}%`,
                  transitionDuration: `${WARNING_FLUSHBAR_DURATION_MS}ms`,
                }}
              />
            </div>
            <div className="flushbar-body flex items-center gap-2.5 px-3.5 py-3">
              <AlertCircle size={36} className="flushbar-icon shrink-0" />
              <div className="min-w-0 space-y-0.5">
                <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                  {actionFlushbar.tone === "error" ? "ERROR" : "WARNING"}
                </p>
                <p className="flushbar-message m-0 text-[14px] font-medium leading-[1.45]">
                  {actionFlushbar.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,#ffffff_0%,#f8fbff_48%,#eef5ff_100%)] p-5 shadow-sm space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Confirmed Companies
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">
            Company-ready actions for confirmed opportunities
          </h1>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <div className="w-full md:w-[52%]">
            <p className="text-xs font-semibold text-slate-600 mb-1">
              Select season
            </p>
            <div className="relative">
              <select
                className="input-base w-full appearance-none pr-10"
                value={selectedSeasonId}
                onChange={(event) => {
                  void handleSeasonChange(event.target.value);
                }}
              >
                <option value="">Select season</option>
                {seasonOptions.map((season) => (
                  <option key={season.value} value={season.value}>
                    {season.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[#4A86E8] bg-[#4A86E8] px-4 py-3 flex items-center justify-between shadow-[0_8px_18px_rgba(74,134,232,0.28)] md:min-w-64">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-black">
                Companies
              </p>
              <p className="mt-1 text-3xl leading-none font-bold text-white">
                {filteredCompanies.length}
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#F8FAFF] flex items-center justify-center shadow-[0_2px_6px_rgba(15,23,42,0.1)]">
              <Building2 size={18} className="text-[#2563EB]" />
            </div>
          </div>
        </div>

        {actionMessage ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {actionMessage}
          </div>
        ) : null}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_42%)] p-4 shadow-sm md:p-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="mb-1 text-xs font-semibold text-slate-600">
            Search companies
          </p>
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search company or drive title"
            className="w-full"
          />
        </div>

        <div className="mt-4">
          {loading ? (
            <section className="space-y-4">
              <ConfirmedCompanyCardSkeleton />
              <ConfirmedCompanyCardSkeleton />
            </section>
          ) : loadingError ? (
            <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm text-rose-700">{loadingError}</p>
            </section>
          ) : filteredCompanies.length === 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-white">
              <EmptyState
                icon={Search}
                title="No companies found"
                description="Pick another confirmed drive or adjust your search."
              />
            </section>
          ) : (
            <section className="space-y-4">
              {filteredCompanies.map((company) => {
                const isActive = selectedCompanyId === company.companyId;
                const hasContacts = company.contacts.length > 0;
                const hasUploadedStudents =
                  company.studentEntryNumbers.length > 0;

                return (
                  <article
                    key={company.companySeasonCycleId}
                    onClick={() => setSelectedCompanyId(company.companyId)}
                    className={`rounded-[26px] border bg-[linear-gradient(135deg,#ffffff,#fbfdff)] p-4 shadow-sm transition md:p-5 ${
                      isActive
                        ? "border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                        : "border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                    }`}
                  >
                    <div className="space-y-3">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">
                          {company.companyName}
                        </h2>
                      </div>

                      {/* <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">Contacts</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {company.contacts.length}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">Students</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {company.studentEntryNumbers.length}
                          </p>
                        </div>
                      </div> */}

                      {company.drives.length > 0 ? (
                        <div className="rounded-xl border border-slate-200 bg-white">
                          <div className="grid grid-cols-1 gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide md:grid-cols-[1.9fr_0.8fr_0.8fr_1.3fr]">
                            <p>Role</p>
                            <p className="text-center">
                              {company.season.seasonType === "intern"
                                ? "Stipend"
                                : "Package (LPA)"}
                            </p>
                            <p className="justify-self-center text-center">
                              Students
                            </p>
                            <p className="text-center">Actions</p>
                          </div>
                          <div className="space-y-2 p-2">
                            {company.drives.map((drive) => {
                              const hasDriveStudents =
                                drive.studentEntryNumbers.length > 0;
                              const currentCompensationText =
                                drive.compensationAmount !== null
                                  ? String(drive.compensationAmount)
                                  : "";
                              const draftCompensationText =
                                stipendDraftByDrive[drive.id] ??
                                currentCompensationText;
                              const isEditingCompensation = Boolean(
                                editingStipendByDrive[drive.id],
                              );
                              const draftNumber = draftCompensationText.trim()
                                ? Number(draftCompensationText)
                                : null;
                              const currentNumber =
                                drive.compensationAmount !== null
                                  ? Number(drive.compensationAmount)
                                  : null;
                              const compensationChanged =
                                (draftNumber === null &&
                                  currentNumber !== null) ||
                                (draftNumber !== null &&
                                  currentNumber === null) ||
                                (draftNumber !== null &&
                                  currentNumber !== null &&
                                  Number(draftNumber.toFixed(2)) !==
                                    Number(currentNumber.toFixed(2)));
                              return (
                                <div
                                  key={drive.id}
                                  className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 px-3 py-2 md:grid-cols-[1.9fr_0.8fr_0.8fr_1.3fr] md:items-center"
                                >
                                  <p className="text-sm font-semibold text-slate-900">
                                    {drive.title}
                                  </p>

                                  <div className="flex items-center justify-center gap-2">
                                    {isEditingCompensation ? (
                                      <>
                                        <input
                                          className="input-base w-20 sm:w-24 border-2 border-[#93C5FD] bg-white text-center font-semibold text-slate-900 focus:border-[#2563EB]"
                                          value={draftCompensationText}
                                          onChange={(event) =>
                                            setStipendDraftByDrive((prev) => ({
                                              ...prev,
                                              [drive.id]: event.target.value,
                                            }))
                                          }
                                          placeholder="0"
                                        />
                                        {compensationChanged ? (
                                          <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={async () => {
                                              const saved =
                                                await saveDriveCompensation(
                                                  company,
                                                  drive,
                                                );
                                              if (saved) {
                                                setEditingStipendByDrive(
                                                  (prev) => ({
                                                    ...prev,
                                                    [drive.id]: false,
                                                  }),
                                                );
                                              }
                                            }}
                                            disabled={Boolean(
                                              savingStipendByDrive[drive.id],
                                            )}
                                          >
                                            {savingStipendByDrive[drive.id]
                                              ? "..."
                                              : "Save"}
                                          </button>
                                        ) : null}
                                        <button
                                          type="button"
                                          className="btn btn-secondary btn-sm px-2"
                                          onClick={() => {
                                            setStipendDraftByDrive((prev) => ({
                                              ...prev,
                                              [drive.id]:
                                                currentCompensationText,
                                            }));
                                            setEditingStipendByDrive(
                                              (prev) => ({
                                                ...prev,
                                                [drive.id]: false,
                                              }),
                                            );
                                          }}
                                          aria-label="Cancel editing stipend or package"
                                          title="Cancel"
                                        >
                                          <X size={13} />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <p className="w-20 sm:w-24 rounded-md border-2 border-[#8f8f8f] bg-white px-2 py-1 text-center text-sm font-semibold text-slate-900">
                                          {currentCompensationText || "-"}
                                        </p>
                                        <button
                                          type="button"
                                          className="btn btn-secondary btn-sm px-2"
                                          onClick={() => {
                                            setStipendDraftByDrive((prev) => ({
                                              ...prev,
                                              [drive.id]:
                                                currentCompensationText,
                                            }));
                                            setEditingStipendByDrive(
                                              (prev) => ({
                                                ...prev,
                                                [drive.id]: true,
                                              }),
                                            );
                                          }}
                                          aria-label="Edit stipend or package"
                                          title="Edit"
                                        >
                                          <Pencil size={13} />
                                        </button>
                                      </>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-center gap-4">
                                    <p className="text-sm font-semibold text-slate-900">
                                      {drive.studentEntryNumbers.length}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!hasDriveStudents) {
                                          showActionWarning(
                                            "No uploaded students for this drive yet.",
                                          );
                                          return;
                                        }

                                        dismissActionFlushbar();
                                        setStudentPreviewDrive({
                                          companyId: company.companyId,
                                          driveId: drive.id,
                                        });
                                      }}
                                      title={
                                        hasDriveStudents
                                          ? "View uploaded list"
                                          : "No uploaded students"
                                      }
                                      aria-label="View uploaded list"
                                      className="btn btn-secondary btn-sm px-2"
                                    >
                                      <Eye size={13} />
                                    </button>
                                  </div>

                                  <div className="flex flex-wrap justify-center gap-2">
                                    <input
                                      id={`upload-students-${drive.id}`}
                                      type="file"
                                      accept=".csv,.xls,.xlsx"
                                      className="hidden"
                                      onChange={(event) =>
                                        void onUploadStudentInfo(
                                          company,
                                          drive,
                                          event,
                                        )
                                      }
                                      disabled={Boolean(
                                        uploadingStudentByDrive[drive.id],
                                      )}
                                    />
                                    <input
                                      id={`compare-attendance-${drive.id}`}
                                      type="file"
                                      accept=".csv,.xls,.xlsx"
                                      className="hidden"
                                      onChange={(event) =>
                                        void onCompareAttendance(
                                          company,
                                          drive,
                                          event,
                                        )
                                      }
                                      disabled={Boolean(
                                        comparingAttendanceByDrive[drive.id],
                                      )}
                                    />

                                    <button
                                      type="button"
                                      onClick={() =>
                                        openInstructionModal(
                                          company,
                                          drive,
                                          "upload",
                                        )
                                      }
                                      disabled={Boolean(
                                        uploadingStudentByDrive[drive.id],
                                      )}
                                      className="btn btn-secondary btn-sm"
                                    >
                                      <Upload size={12} />
                                      {uploadingStudentByDrive[drive.id]
                                        ? "Uploading..."
                                        : "Upload List"}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!hasDriveStudents) {
                                          showActionWarning(
                                            "Upload students before checking attendance.",
                                          );
                                          return;
                                        }

                                        dismissActionFlushbar();
                                        openInstructionModal(
                                          company,
                                          drive,
                                          "compare",
                                        );
                                      }}
                                      disabled={Boolean(
                                        comparingAttendanceByDrive[drive.id],
                                      )}
                                      className="btn btn-secondary btn-sm"
                                    >
                                      <FileSpreadsheet size={12} />
                                      {comparingAttendanceByDrive[drive.id]
                                        ? "Processing..."
                                        : "Attendance"}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                          No drives available for this company-season cycle.
                        </div>
                      )}

                      <div className="flex flex-wrap justify-start gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!hasContacts) {
                              showActionWarning(
                                "No contact is available for this company.",
                              );
                              return;
                            }

                            dismissActionFlushbar();
                            void logCall(company);
                          }}
                          disabled={
                            submittingAction[`call:${company.companyId}`]
                          }
                          className="btn btn-primary btn-sm w-auto justify-center text-center"
                        >
                          {submittingAction[`call:${company.companyId}`] ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <PhoneCall size={15} />
                          )}
                          {submittingAction[`call:${company.companyId}`]
                            ? "Logging..."
                            : "Call"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!hasUploadedStudents) {
                              showActionWarning(
                                "Upload students before scheduling an event.",
                              );
                              return;
                            }

                            dismissActionFlushbar();
                            openScheduleModal(company);
                          }}
                          className="btn btn-primary btn-sm w-auto justify-center text-center"
                        >
                          <CalendarPlus size={15} />
                          Schedule
                        </button>
                        <button
                          type="button"
                          onClick={() => void sendMailRequest(company)}
                          disabled={
                            submittingAction[
                              `mail:students:${company.companyId}`
                            ]
                          }
                          className="btn btn-primary btn-sm w-auto justify-center text-center"
                        >
                          {submittingAction[
                            `mail:students:${company.companyId}`
                          ] ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Users size={15} />
                          )}
                          {submittingAction[
                            `mail:students:${company.companyId}`
                          ]
                            ? "Requesting..."
                            : "Mail"}
                        </button>
                        <button
                          type="button"
                          onClick={() => openTelegramModal(company)}
                          className="btn btn-primary btn-sm w-auto justify-center text-center"
                        >
                          <Send size={15} />
                          Telegram
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </section>

      <Modal
        isOpen={telegramModalOpen}
        onClose={() => setTelegramModalOpen(false)}
        title={
          telegramCompany
            ? `Telegram - ${telegramCompany.companyName}`
            : "Telegram"
        }
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
            <p className="text-xs font-semibold text-slate-600 mb-1">
              Template
            </p>
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
                  Roles:{" "}
                  {telegramCompany.roles.length > 0
                    ? telegramCompany.roles.join(", ")
                    : "Not mapped"}
                </p>
                <p>Notes: {telegramCompany.notes ?? "None"}</p>
              </div>
            ) : (
              <p>No company selected.</p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            <p className="font-semibold text-slate-800 mb-1">
              Selected Contact
            </p>
            {telegramContact ? (
              <div className="space-y-0.5">
                <p>Name: {telegramContact.name}</p>
                <p>
                  Designation: {telegramContact.designation ?? "Not available"}
                </p>
                <p>Phone: {telegramContact.phones[0] ?? "Not available"}</p>
                <p>Email: {telegramContact.emails[0] ?? "Not available"}</p>
              </div>
            ) : (
              <p>No contact selected.</p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1">
              Telegram Message
            </p>
            <textarea
              className="input-base min-h-52 resize-y"
              disabled={!telegramCompany}
              value={
                telegramCompany
                  ? (manualTelegramByCompany[telegramCompany.companyId] ?? "")
                  : ""
              }
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
        isOpen={Boolean(studentPreviewDriveItem)}
        onClose={() => setStudentPreviewDrive(null)}
        title={
          studentPreviewCompany && studentPreviewDriveItem
            ? `Students - ${studentPreviewCompany.companyName} - ${studentPreviewDriveItem.title}`
            : "Students"
        }
        size="lg"
        footer={
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setStudentPreviewDrive(null)}
          >
            Close
          </button>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Uploaded students:{" "}
            <span className="font-semibold text-slate-800">
              {studentPreviewDriveItem?.studentEntryNumbers.length ?? 0}
            </span>
          </p>

          {studentPreviewDriveItem &&
          studentPreviewDriveItem.studentEntryNumbers.length > 0 ? (
            <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">
                      #
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">
                      Entry Number
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">
                      Email
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {studentPreviewDriveItem.studentEntryNumbers.map(
                    (entry, index) => (
                      <tr
                        key={entry}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="px-3 py-2 text-slate-600">
                          {index + 1}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {entry}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {entry}@iitrpr.ac.in
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No students uploaded yet for this role.
            </p>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(
          instructionModalTask &&
          instructionModalCompany &&
          instructionModalDrive,
        )}
        onClose={closeInstructionModal}
        title={
          instructionModalTask === "upload"
            ? `Upload Students Instructions - ${instructionModalCompany?.companyName ?? ""} - ${instructionModalDrive?.title ?? ""}`
            : `Compare Attendance Instructions - ${instructionModalCompany?.companyName ?? ""} - ${instructionModalDrive?.title ?? ""}`
        }
        size="md"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={closeInstructionModal}
            >
              Cancel
            </button>
            {instructionModalTask === "upload" ? (
              <button
                type="button"
                className="btn btn-sm border border-[#1D4ED8] bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
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
              disabled={
                !instructionModalTask ||
                !instructionModalCompany ||
                !instructionModalDrive
              }
            >
              Continue
            </button>
          </>
        }
      >
        {instructionModalTask === "upload" ? (
          <div className="space-y-2 text-sm text-slate-700">
            <p>
              File can have{" "}
              <span className="font-semibold">any number of columns</span>.
            </p>
            <p>
              One required column must be exactly:{" "}
              <span className="font-semibold">Roll No</span>.
            </p>
          </div>
        ) : instructionModalTask === "compare" ? (
          <div className="space-y-2 text-sm text-slate-700">
            <p>
              Upload{" "}
              <span className="font-semibold">CSV exported from Acadly</span>.
            </p>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={compareResultModalOpen}
        onClose={() => setCompareResultModalOpen(false)}
        title={
          compareResultCompanyName
            ? `Attendance Records - ${compareResultCompanyName}${compareResultDriveTitle ? ` - ${compareResultDriveTitle}` : ""}`
            : "Attendance Records"
        }
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
                const company = acceptedCompanies.find(
                  (item) => item.companyId === compareResultCompanyId,
                );
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
                Matched:{" "}
                <span className="font-semibold text-emerald-700">
                  {compareResultPayload.matchedCount}
                </span>{" "}
                | Missing:{" "}
                <span className="font-semibold text-rose-700">
                  {compareResultPayload.missingCount}
                </span>
              </p>

              <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        #
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Entry Number
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Matched
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareResultPayload.rows.map((row, index) => (
                      <tr
                        key={`${row.entryNumber}-${index}`}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="px-3 py-2 text-slate-600">
                          {index + 1}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {row.entryNumber}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {row.attendanceStatus}
                        </td>
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
          const driveId = studentUploadPreview?.driveId ?? "";
          if (driveId && uploadingStudentByDrive[driveId]) {
            return;
          }
          setStudentUploadPreview(null);
        }}
        title={
          studentUploadPreview
            ? `Preview Student Upload - ${studentUploadPreview.companyName} - ${studentUploadPreview.driveTitle}`
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
                studentUploadPreview &&
                uploadingStudentByDrive[studentUploadPreview.driveId],
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
                (studentUploadPreview &&
                  uploadingStudentByDrive[studentUploadPreview.driveId]),
              )}
            >
              {studentUploadPreview &&
              uploadingStudentByDrive[studentUploadPreview.driveId]
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
                File:{" "}
                <span className="font-semibold">
                  {studentUploadPreview.file.name}
                </span>
              </p>
              <p>
                Detected column:{" "}
                <span className="font-semibold">
                  {studentUploadPreview.rollHeader}
                </span>
              </p>
              <p>
                Valid entries:{" "}
                <span className="font-semibold text-emerald-700">
                  {studentUploadPreview.validEntries.length}
                </span>{" "}
                | Invalid rows:{" "}
                <span className="font-semibold text-rose-700">
                  {studentUploadPreview.invalidRows.length}
                </span>{" "}
                | Data rows:{" "}
                <span className="font-semibold">
                  {studentUploadPreview.totalDataRows}
                </span>
              </p>
            </div>

            <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">
                      #
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">
                      Entry Number
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">
                      Email
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {studentUploadPreview.validEntries
                    .slice(0, 200)
                    .map((entry, index) => (
                      <tr
                        key={entry}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="px-3 py-2 text-slate-600">
                          {index + 1}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {entry}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {entry}@iitrpr.ac.in
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {studentUploadPreview.validEntries.length > 200 ? (
              <p className="text-xs text-slate-500">
                Showing first 200 entries in preview. All valid entries will be
                uploaded.
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
