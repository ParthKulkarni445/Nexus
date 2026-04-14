"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  AlertCircle,
  Building2,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  Check,
  Copy,
  Eye,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  Mail,
  Pencil,
  PhoneCall,
  Plus,
  Search,
  Upload,
  Users,
  X,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import MailAttachmentInput, {
  type MailAttachmentMeta,
} from "@/components/ui/MailAttachmentInput";
import Modal from "@/components/ui/Modal";
import RichTextEditor from "@/components/ui/RichTextEditor";
import SearchBar from "@/components/ui/SearchBar";

type ApiResponse<T> = {
  data?: T;
  error?: {
    message?: string;
  };
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

type ConfirmedContact = ConfirmedCompany["contacts"][number];

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
};

type UploadMatchSuggestion = {
  companyId: string;
  companyName: string;
  score: number;
  reason: string;
};

type UploadedCompanyPreviewItem = {
  uploadedCompanyName: string;
  rowCount: number;
  uniqueEntryCount: number;
  sheets: string[];
  roles: string[];
  matchedCompany: UploadMatchSuggestion | null;
  suggestions: UploadMatchSuggestion[];
};

type CompanyUploadPreviewResponse = {
  fileName: string;
  matchedSheetNames: string[];
  parsedStudentRows: number;
  skippedStudentRows: number;
  uploadedCompanyCount: number;
  autoMatchedCount: number;
  matchedCompanies: UploadedCompanyPreviewItem[];
  unmatchedCompanies: UploadedCompanyPreviewItem[];
};

type CompanyUploadProcessResponse = {
  seasonId: string;
  seasonType: "intern" | "placement";
  processedRowCount: number;
  createdPlacements: number;
  updatedPlacements: number;
  linkedStudentEntries: number;
  unmatchedStudentEntryNumbers: string[];
  manualMatchCount: number;
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

type MailTemplate = {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
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
  tone: "warning" | "error" | "success";
  message: string;
  progress: number;
};

type CompensationInputUnit = "lpa" | "cr" | "lpm" | "kpm";
type SeasonType = ConfirmedCompany["season"]["seasonType"];

const WARNING_FLUSHBAR_DURATION_MS = 3500;

function getDefaultCompensationUnit(
  seasonType: SeasonType,
): CompensationInputUnit {
  return seasonType === "placement" ? "lpa" : "lpm";
}

function getCompensationUnitFromCanonical(
  seasonType: SeasonType,
  value: number | null,
): CompensationInputUnit {
  if (value === null || !Number.isFinite(value) || value <= 0) {
    return getDefaultCompensationUnit(seasonType);
  }

  if (seasonType === "placement") {
    return value >= 100 ? "cr" : "lpa";
  }

  return value < 1 ? "kpm" : "lpm";
}

function normalizeCompensationUnit(
  seasonType: SeasonType,
  unit: CompensationInputUnit,
): CompensationInputUnit {
  if (seasonType === "placement") {
    return unit === "cr" || unit === "lpa" ? unit : "lpa";
  }

  return unit === "kpm" || unit === "lpm" ? unit : "lpm";
}

function inputToCanonicalCompensation(
  seasonType: SeasonType,
  value: number,
  unit: CompensationInputUnit,
) {
  if (seasonType === "placement") {
    return unit === "cr" ? value * 100 : value;
  }

  return unit === "kpm" ? value / 100 : value;
}

function canonicalToInputCompensation(
  seasonType: SeasonType,
  value: number,
  unit: CompensationInputUnit,
) {
  if (seasonType === "placement") {
    return unit === "cr" ? value / 100 : value;
  }

  return unit === "kpm" ? value * 100 : value;
}

function toCompensationDraftValue(value: number) {
  return String(Number(value.toFixed(2)));
}

function parseCanonicalCompensationFromDraft(
  seasonType: SeasonType,
  draft: string,
  unit: CompensationInputUnit,
): number | null | "invalid" {
  const text = draft.trim();
  if (!text) return null;

  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return "invalid";
  }

  return inputToCanonicalCompensation(seasonType, parsed, unit);
}

function formatCompensationValue(
  seasonType: SeasonType,
  value: number | null,
): string {
  if (value === null || !Number.isFinite(value) || value <= 0) return "-";

  if (seasonType === "placement") {
    return value >= 100
      ? `${(value / 100).toFixed(2)} Cr`
      : `${value.toFixed(2)} LPA`;
  }

  return value < 1
    ? `${(value * 100).toFixed(0)} KPM`
    : `${value.toFixed(2)} LPM`;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeEntryNumber(rawValue: string) {
  const compact = rawValue.trim().toUpperCase().replace(/\s+/g, "");
  if (!compact) return null;
  return /^\d{4}[A-Z]{3}\d{4}$/.test(compact) ? compact : null;
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

function htmlToPlainText(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function copyToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return;
  }

  throw new Error("Clipboard API is not available");
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

  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [query, setQuery] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [stipendDraftByDrive, setStipendDraftByDrive] = useState<
    Record<string, string>
  >({});
  const [compensationUnitByDrive, setCompensationUnitByDrive] = useState<
    Record<string, CompensationInputUnit>
  >({});
  const [editingStipendByDrive, setEditingStipendByDrive] = useState<
    Record<string, boolean>
  >({});
  const [savingStipendByDrive, setSavingStipendByDrive] = useState<
    Record<string, boolean>
  >({});
  const [callCompanyId, setCallCompanyId] = useState("");
  const [callContactId, setCallContactId] = useState("");
  const [mailCompanyId, setMailCompanyId] = useState("");
  const [mailContactId, setMailContactId] = useState("");
  const [mailRequestType, setMailRequestType] = useState<"template" | "custom">(
    "template",
  );
  const [mailTemplateId, setMailTemplateId] = useState("");
  const [mailToRecipients, setMailToRecipients] = useState("");
  const [mailCcRecipients, setMailCcRecipients] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [mailAttachments, setMailAttachments] = useState<MailAttachmentMeta[]>(
    [],
  );
  const [mailTemplates, setMailTemplates] = useState<MailTemplate[]>([]);
  const [studentMailCompanyId, setStudentMailCompanyId] = useState("");
  const [studentMailDriveId, setStudentMailDriveId] = useState("");
  const [studentMailToEmails, setStudentMailToEmails] = useState<string[]>([]);
  const [studentMailSubject, setStudentMailSubject] = useState("");
  const [studentMailBody, setStudentMailBody] = useState("");
  const [studentMailAttachments, setStudentMailAttachments] = useState<
    MailAttachmentMeta[]
  >([]);
  const [studentMailSubmitting, setStudentMailSubmitting] = useState(false);
  const [addRoleCompanyId, setAddRoleCompanyId] = useState("");
  const [addRoleTitle, setAddRoleTitle] = useState("");
  const [addRoleCompensation, setAddRoleCompensation] = useState("");
  const [addRoleCompensationUnit, setAddRoleCompensationUnit] =
    useState<CompensationInputUnit>("lpa");
  const [addRoleSubmitting, setAddRoleSubmitting] = useState(false);
  const [companyMailSubmitting, setCompanyMailSubmitting] = useState(false);
  const [copiedDriveActionKey, setCopiedDriveActionKey] = useState<
    string | null
  >(null);
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
  const [companyUploadSubmitting, setCompanyUploadSubmitting] = useState(false);
  const [companyUploadInstructionOpen, setCompanyUploadInstructionOpen] =
    useState(false);
  const [companyUploadPreview, setCompanyUploadPreview] =
    useState<CompanyUploadPreviewResponse | null>(null);
  const [companyUploadFile, setCompanyUploadFile] = useState<File | null>(null);
  const [manualCompanyMatches, setManualCompanyMatches] = useState<
    Record<string, string>
  >({});

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
  const [loggedInUserEmail, setLoggedInUserEmail] = useState("");
  const companyUploadInputRef = useRef<HTMLInputElement | null>(null);
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

  const dismissActionFlushbar = useCallback(() => {
    clearActionFlushbarTimers();
    setActionFlushbar(null);
  }, []);

  const showActionFlushbar = useCallback(
    (tone: "warning" | "error" | "success", message: string) => {
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
    },
    [dismissActionFlushbar],
  );

  function showActionWarning(message: string) {
    showActionFlushbar("warning", message);
  }

  function showActionError(message: string) {
    showActionFlushbar("error", message);
  }

  function showActionSuccess(message: string) {
    showActionFlushbar("success", message);
  }

  useEffect(() => {
    if (!actionError.trim()) {
      return;
    }

    function showActionError(message: string) {
      showActionFlushbar("error", message);
    }

    showActionError(actionError);
    setActionError("");
  }, [actionError, showActionFlushbar]);

  useEffect(() => {
    if (!actionMessage.trim()) {
      return;
    }

    showActionSuccess(actionMessage);
    setActionMessage("");
  }, [actionMessage]);

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
      setCompensationUnitByDrive((current) => {
        const next = { ...current };
        for (const company of payload.acceptedCompanies) {
          for (const drive of company.drives) {
            if (!next[drive.id]) {
              next[drive.id] = getCompensationUnitFromCanonical(
                company.season.seasonType,
                drive.compensationAmount,
              );
            }
          }
        }
        return next;
      });
      setStipendDraftByDrive((current) => {
        const next = { ...current };
        for (const company of payload.acceptedCompanies) {
          for (const drive of company.drives) {
            if (!next[drive.id]) {
              const unit = getCompensationUnitFromCanonical(
                company.season.seasonType,
                drive.compensationAmount,
              );
              next[drive.id] =
                drive.compensationAmount !== null
                  ? toCompensationDraftValue(
                      canonicalToInputCompensation(
                        company.season.seasonType,
                        drive.compensationAmount,
                        unit,
                      ),
                    )
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

  useEffect(() => {
    void (async () => {
      try {
        const templates = await requestJson<MailTemplate[]>(
          "/api/v1/mail/templates",
        );
        setMailTemplates(templates);
      } catch {
        setMailTemplates([]);
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

  const confirmedCompanyOptions = useMemo(
    () =>
      [...acceptedCompanies].sort((left, right) =>
        left.companyName.localeCompare(right.companyName),
      ),
    [acceptedCompanies],
  );

  const unresolvedUploadedCompanies = useMemo(() => {
    if (!companyUploadPreview) {
      return [];
    }

    return companyUploadPreview.unmatchedCompanies.filter(
      (company) => !manualCompanyMatches[company.uploadedCompanyName],
    );
  }, [companyUploadPreview, manualCompanyMatches]);

  const callCompany = useMemo(
    () =>
      acceptedCompanies.find(
        (company) => company.companyId === callCompanyId,
      ) ?? null,
    [acceptedCompanies, callCompanyId],
  );

  const selectedCallContact = useMemo(
    () =>
      callCompany?.contacts.find((contact) => contact.id === callContactId) ??
      null,
    [callCompany, callContactId],
  );

  const mailCompany = useMemo(
    () =>
      acceptedCompanies.find(
        (company) => company.companyId === mailCompanyId,
      ) ?? null,
    [acceptedCompanies, mailCompanyId],
  );

  const selectedMailContact = useMemo(
    () =>
      mailCompany?.contacts.find((contact) => contact.id === mailContactId) ??
      null,
    [mailCompany, mailContactId],
  );

  const selectedMailTemplate = useMemo(
    () =>
      mailTemplates.find((template) => template.id === mailTemplateId) ?? null,
    [mailTemplates, mailTemplateId],
  );

  const addRoleCompany = useMemo(
    () =>
      acceptedCompanies.find(
        (company) => company.companyId === addRoleCompanyId,
      ) ?? null,
    [acceptedCompanies, addRoleCompanyId],
  );

  const studentMailCompany = useMemo(
    () =>
      acceptedCompanies.find(
        (company) => company.companyId === studentMailCompanyId,
      ) ?? null,
    [acceptedCompanies, studentMailCompanyId],
  );

  const studentMailDrive = useMemo(
    () =>
      studentMailCompany?.drives.find(
        (drive) => drive.id === studentMailDriveId,
      ) ?? null,
    [studentMailCompany, studentMailDriveId],
  );

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

  function openCallModal(company: ConfirmedCompany) {
    setCallCompanyId(company.companyId);
    setCallContactId(company.contacts[0]?.id ?? "");
    setActionError("");
  }

  function closeCallModal() {
    setCallCompanyId("");
    setCallContactId("");
  }

  function openCompanyMailModal(company: ConfirmedCompany) {
    const primaryContact = company.contacts[0] ?? null;
    setMailCompanyId(company.companyId);
    setMailContactId(primaryContact?.id ?? "");
    setMailRequestType("template");
    setMailTemplateId("");
    setMailToRecipients((primaryContact?.emails ?? []).join(", "));
    setMailCcRecipients("");
    setMailSubject(primaryContact ? `${company.companyName} - Follow-up` : "");
    setMailBody("");
    setMailAttachments([]);
    setActionError("");
  }

  function closeCompanyMailModal(force = false) {
    if (companyMailSubmitting && !force) return;
    setMailCompanyId("");
    setMailContactId("");
    setMailRequestType("template");
    setMailTemplateId("");
    setMailToRecipients("");
    setMailCcRecipients("");
    setMailSubject("");
    setMailBody("");
    setMailAttachments([]);
  }

  function openAddRoleModal(company: ConfirmedCompany) {
    setAddRoleCompanyId(company.companyId);
    setAddRoleTitle("");
    setAddRoleCompensation("");
    setAddRoleCompensationUnit(
      getDefaultCompensationUnit(company.season.seasonType),
    );
    setSelectedCompanyId(company.companyId);
    setActionError("");
  }

  function closeAddRoleModal(force = false) {
    if (addRoleSubmitting && !force) return;
    setAddRoleCompanyId("");
    setAddRoleTitle("");
    setAddRoleCompensation("");
    setAddRoleCompensationUnit("lpa");
  }

  async function submitAddRole() {
    if (!addRoleCompany) {
      setActionError("Select a company before creating a role.");
      return;
    }

    const nextTitle = addRoleTitle.trim();
    if (!nextTitle) {
      setActionError("Role title is required.");
      return;
    }

    const parsedCompensation = parseCanonicalCompensationFromDraft(
      addRoleCompany.season.seasonType,
      addRoleCompensation,
      normalizeCompensationUnit(
        addRoleCompany.season.seasonType,
        addRoleCompensationUnit,
      ),
    );

    let compensationAmount: number | undefined;
    if (parsedCompensation === "invalid") {
      setActionError("Compensation must be a valid non-negative number.");
      return;
    }

    if (typeof parsedCompensation === "number") {
      if (parsedCompensation > 9999) {
        setActionError("Compensation value is too high.");
        return;
      }

      compensationAmount = Number(parsedCompensation.toFixed(2));
    }

    setAddRoleSubmitting(true);
    setActionError("");
    setActionMessage("");

    try {
      await requestJson("/api/v1/drives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: addRoleCompany.companyId,
          companySeasonCycleId: addRoleCompany.companySeasonCycleId,
          title: nextTitle,
          compensationAmount,
        }),
      });

      await fetchConfirmedData(selectedSeasonId || undefined);
      setSelectedCompanyId(addRoleCompany.companyId);
      setActionMessage(
        `Added role ${nextTitle} for ${addRoleCompany.companyName}.`,
      );
      closeAddRoleModal(true);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to create role",
      );
    } finally {
      setAddRoleSubmitting(false);
    }
  }

  async function submitCompanyMail() {
    if (!mailCompany) {
      setActionError("Select a company before sending mail.");
      return;
    }

    const toEmails = parseRecipientInput(mailToRecipients);
    const ccEmails = parseRecipientInput(mailCcRecipients);

    if (toEmails.length === 0) {
      setActionError("At least one recipient is required in To.");
      return;
    }

    if (mailRequestType === "template" && !mailTemplateId) {
      setActionError("Select a template before queueing mail.");
      return;
    }

    if (
      mailRequestType === "custom" &&
      (!mailSubject.trim() || !htmlToPlainText(mailBody))
    ) {
      setActionError("Subject and body are required for custom mail.");
      return;
    }

    setCompanyMailSubmitting(true);
    setActionError("");
    setActionMessage("");

    try {
      await requestJson("/api/v1/mail/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: mailCompany.companyId,
          companySeasonCycleId: mailCompany.companySeasonCycleId,
          requestType: mailRequestType,
          templateId:
            mailRequestType === "template" ? mailTemplateId : undefined,
          customSubject:
            mailRequestType === "custom" ? mailSubject.trim() : undefined,
          customBody:
            mailRequestType === "custom" ? mailBody.trim() : undefined,
          recipientFilter: {
            contactIds: selectedMailContact ? [selectedMailContact.id] : [],
            emails: toEmails,
            ccEmails,
          },
          previewPayload: {
            source: "confirmed_tab",
            mode: "company",
            companyName: mailCompany.companyName,
            contactName: selectedMailContact?.name ?? null,
            templateName:
              mailRequestType === "template"
                ? selectedMailTemplate?.name
                : null,
          },
          attachments: mailAttachments,
          urgency: 3,
        }),
      });

      setActionMessage(
        `Company mail request queued for ${mailCompany.companyName}.`,
      );
      closeCompanyMailModal(true);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to create company mail request",
      );
    } finally {
      setCompanyMailSubmitting(false);
    }
  }

  async function saveDriveCompensation(
    company: ConfirmedCompany,
    drive: ConfirmedCompany["drives"][number],
    unit: CompensationInputUnit,
  ) {
    const draft = stipendDraftByDrive[drive.id] ?? "";
    const canonicalValue = parseCanonicalCompensationFromDraft(
      company.season.seasonType,
      draft,
      normalizeCompensationUnit(company.season.seasonType, unit),
    );

    if (canonicalValue === "invalid") {
      setActionError("Compensation value must be a valid non-negative number.");
      return false;
    }

    const nextValue =
      typeof canonicalValue === "number"
        ? Number(canonicalValue.toFixed(2))
        : null;

    if (nextValue !== null && nextValue > 9999) {
      setActionError("Compensation value is too high.");
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

  function getDriveStudentEmails(
    drive: ConfirmedCompany["drives"][number],
  ): string[] {
    return Array.from(
      new Set(
        drive.studentEntryNumbers
          .map((entry) => normalizeEntryNumber(entry))
          .filter((entry): entry is string => Boolean(entry))
          .map((entry) => `${entry.toLowerCase()}@iitrpr.ac.in`),
      ),
    );
  }

  function buildDriveDetails(
    company: ConfirmedCompany,
    drive: ConfirmedCompany["drives"][number],
  ) {
    const contact = company.contacts[0] ?? null;
    const compensationLabel =
      company.season.seasonType === "intern" ? "Stipend" : "Package";

    return [
      `Company: ${company.companyName}`,
      `Role: ${drive.title}`,
      `${compensationLabel}: ${
        drive.compensationAmount !== null
          ? formatCompensationValue(
              company.season.seasonType,
              drive.compensationAmount,
            )
          : "Not set"
      }`,
      "Duration: ",
      "CGPA: ",
      "Eligible Branches: ",
      "Backlogs Allowed: ",
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function handleCopyDriveDetails(
    company: ConfirmedCompany,
    drive: ConfirmedCompany["drives"][number],
  ) {
    const actionKey = `copy:${drive.id}`;

    try {
      await copyToClipboard(buildDriveDetails(company, drive));
      setCopiedDriveActionKey(actionKey);
      setActionError("");
      setActionMessage(
        `Copied details for ${company.companyName} - ${drive.title}.`,
      );
      window.setTimeout(() => {
        setCopiedDriveActionKey((current) =>
          current === actionKey ? null : current,
        );
      }, 1800);
    } catch {
      setCopiedDriveActionKey(null);
      setActionError("Unable to copy details right now.");
    }
  }

  function openStudentMailModal(
    company: ConfirmedCompany,
    drive: ConfirmedCompany["drives"][number],
  ) {
    const studentEmails = getDriveStudentEmails(drive);

    if (drive.studentEntryNumbers.length === 0) {
      showActionWarning("No uploaded students for this role yet.");
      return;
    }

    if (studentEmails.length === 0) {
      showActionWarning(
        "Student emails are not available for this uploaded list.",
      );
      return;
    }

    setStudentMailCompanyId(company.companyId);
    setStudentMailDriveId(drive.id);
    setStudentMailToEmails(studentEmails);
    setStudentMailSubject(
      `${company.companyName} - ${drive.title} update for students`,
    );
    // setStudentMailBody(buildDriveDetails(company, drive));
    setStudentMailAttachments([]);
    setSelectedCompanyId(company.companyId);
    setActionError("");
  }

  function closeStudentMailModal(force = false) {
    if (studentMailSubmitting && !force) return;
    setStudentMailCompanyId("");
    setStudentMailDriveId("");
    setStudentMailToEmails([]);
    setStudentMailSubject("");
    setStudentMailBody("");
    setStudentMailAttachments([]);
  }

  async function submitStudentMailRequest() {
    if (!studentMailCompany || !studentMailDrive) {
      setActionError("Select a valid company and role before sending mail.");
      return;
    }

    if (!studentMailSubject.trim() || !studentMailBody.trim()) {
      setActionError("Subject and body are required for student mail.");
      return;
    }

    if (studentMailToEmails.length === 0) {
      setActionError("No student email recipients found.");
      return;
    }

    setStudentMailSubmitting(true);
    setActionError("");
    setActionMessage("");

    try {
      await requestJson("/api/v1/mail/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: studentMailCompany.companyId,
          companySeasonCycleId: studentMailCompany.companySeasonCycleId,
          requestType: "custom",
          customSubject: studentMailSubject.trim(),
          customBody: studentMailBody.trim(),
          recipientFilter: {
            emails: studentMailToEmails,
          },
          previewPayload: {
            source: "confirmed_tab",
            mode: "students",
            companyName: studentMailCompany.companyName,
            driveTitle: studentMailDrive.title,
            contactName: null,
          },
          attachments: studentMailAttachments,
          urgency: 3,
        }),
      });

      setActionMessage(
        `Mailing request queued for ${studentMailToEmails.length} students in ${studentMailDrive.title}.`,
      );
      closeStudentMailModal(true);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to create mail request",
      );
    } finally {
      setStudentMailSubmitting(false);
    }
  }

  function openGoogleForm(company: ConfirmedCompany) {
    const scriptUrl =
      process.env.NEXT_PUBLIC_CONFIRMED_GOOGLE_SCRIPT_WEB_APP_URL?.trim() ?? "";

    if (!scriptUrl) {
      setActionError(
        "Google Script URL is not configured. Set NEXT_PUBLIC_CONFIRMED_GOOGLE_SCRIPT_WEB_APP_URL.",
      );
      return;
    }

    const matchedSeason = seasons.find(
      (season) => season.id === company.season.id,
    );
    const seasonYear =
      matchedSeason?.academicYear?.trim() || company.season.name;
    let finalUrl: URL;
    try {
      finalUrl = new URL(scriptUrl);
    } catch {
      setActionError("Configured Google Script URL is invalid.");
      return;
    }

    finalUrl.searchParams.set("companyName", company.companyName);
    finalUrl.searchParams.set("seasonYear", seasonYear);

    window.open(finalUrl.toString(), "_blank", "noopener,noreferrer");
    setActionMessage(
      `Opened Google Script form creator for ${company.companyName}.`,
    );
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

  function openCompanyUploadPicker() {
    if (!selectedSeasonId) {
      showActionWarning("Pick a season before uploading confirmed company data.");
      return;
    }

    setCompanyUploadInstructionOpen(true);
  }

  function closeCompanyUploadInstruction() {
    if (companyUploadSubmitting) {
      return;
    }

    setCompanyUploadInstructionOpen(false);
  }

  async function downloadCompanyUploadTemplate() {
    try {
      const response = await fetch("/api/v1/confirmed/company-upload-template", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Unable to download upload template");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "confirmed-company-upload-template.xlsx";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (error) {
      showActionError(
        error instanceof Error
          ? error.message
          : "Unable to download upload template",
      );
    }
  }

  function continueToCompanyUpload() {
    setCompanyUploadInstructionOpen(false);
    companyUploadInputRef.current?.click();
  }

  function closeCompanyUploadPreview(force = false) {
    if (companyUploadSubmitting && !force) {
      return;
    }

    setCompanyUploadPreview(null);
    setCompanyUploadFile(null);
    setManualCompanyMatches({});

    if (companyUploadInputRef.current) {
      companyUploadInputRef.current.value = "";
    }
  }

  async function proceedCompanyUploadPreview() {
    if (!companyUploadPreview || !companyUploadFile || !selectedSeasonId) {
      return;
    }

    if (unresolvedUploadedCompanies.length > 0) {
      showActionWarning(
        "Match all unmatched uploaded company names before proceeding.",
      );
      return;
    }

    const previewPayload = companyUploadPreview;
    const uploadFile = companyUploadFile;
    const seasonId = selectedSeasonId;
    const resolvedCompanyMatches: Record<string, string> = {
      ...Object.fromEntries(
        (previewPayload.matchedCompanies ?? [])
          .filter((company) => company.matchedCompany?.companyId)
          .map((company) => [
            company.uploadedCompanyName,
            company.matchedCompany!.companyId,
          ]),
      ),
      ...manualCompanyMatches,
    };

    setCompanyUploadSubmitting(true);
    dismissActionFlushbar();
    closeCompanyUploadPreview(true);

    try {
      const formData = new FormData();
      formData.append("seasonId", seasonId);
      formData.append("file", uploadFile);
      formData.append(
        "manualMatches",
        JSON.stringify(resolvedCompanyMatches),
      );

      const payload = await requestJson<CompanyUploadProcessResponse>(
        "/api/v1/confirmed/company-upload-process",
        {
          method: "POST",
          body: formData,
        },
      );

      await fetchConfirmedData(seasonId);

      const unmatchedText =
        payload.unmatchedStudentEntryNumbers.length > 0
          ? ` ${payload.unmatchedStudentEntryNumbers.length} student entries could not be matched to users.`
          : "";

      showActionSuccess(
        `Processed ${payload.processedRowCount} rows: ${payload.createdPlacements} placements created, ${payload.updatedPlacements} updated, and ${payload.linkedStudentEntries} student entries linked.${unmatchedText}`,
      );
    } catch (error) {
      showActionError(
        error instanceof Error
          ? error.message
          : "Unable to process confirmed company upload",
      );
    } finally {
      setCompanyUploadSubmitting(false);
    }
  }

  function updateManualCompanyMatch(uploadedCompanyName: string, companyId: string) {
    setManualCompanyMatches((current) => ({
      ...current,
      [uploadedCompanyName]: companyId,
    }));
  }

  async function handleCompanyUploadFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!selectedSeasonId) {
      showActionWarning("Pick a season before uploading confirmed company data.");
      event.target.value = "";
      return;
    }

    setCompanyUploadSubmitting(true);
    dismissActionFlushbar();

    try {
      const formData = new FormData();
      formData.append("seasonId", selectedSeasonId);
      formData.append("file", file);

      const payload = await requestJson<CompanyUploadPreviewResponse>(
        "/api/v1/confirmed/company-upload-preview",
        {
          method: "POST",
          body: formData,
        },
      );

      setCompanyUploadPreview(payload);
      setCompanyUploadFile(file);
      setManualCompanyMatches({});
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to process confirmed company upload",
      );
    } finally {
      setCompanyUploadSubmitting(false);
      event.target.value = "";
    }
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
        <div className="flushbar-stack fixed right-4 bottom-4 z-50 w-[min(92vw,600px)] pointer-events-none">
          <div
            className={`flushbar flushbar-${actionFlushbar.tone} rounded-xl border shadow-lg`}
          >
            <div className="flushbar-progress-track h-1 w-full">
              <div
                className="flushbar-progress h-full"
                style={{
                  width: `${actionFlushbar.progress}%`,
                  transition: `width ${WARNING_FLUSHBAR_DURATION_MS}ms linear`,
                }}
              />
            </div>
            <div className="flushbar-body flex items-start gap-2.5 px-3.5 py-3">
              {actionFlushbar.tone === "success" ? (
                <CheckCircle2
                  size={36}
                  className="flushbar-icon shrink-0 mt-0.5"
                />
              ) : (
                <AlertCircle
                  size={36}
                  className="flushbar-icon shrink-0 mt-0.5"
                />
              )}
              <div className="flex-1 space-y-0.5 min-w-0">
                <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                  {actionFlushbar.tone === "error"
                    ? "ERROR"
                    : actionFlushbar.tone === "warning"
                      ? "WARNING"
                      : "SUCCESS"}
                </p>
                <p className="flushbar-message m-0 text-[14px] font-medium leading-[1.45] whitespace-normal wrap-break-word">
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

          <div className="rounded-2xl border border-[#4A86E8] bg-[#4A86E8] px-4 py-3 flex items-center justify-between shadow-[0_8px_18px_rgba(74,134,232,0.28)] md:min-w-64 transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer">
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
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_42%)] p-4 shadow-sm md:p-5">
        <input
          ref={companyUploadInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(event) => void handleCompanyUploadFileChange(event)}
        />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-3">
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

          <div className="rounded-2xl border border-slate-200 bg-white p-3 lg:w-[18rem]">
            <p className="mb-1 text-xs font-semibold text-slate-600">
              Upload placement data
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm w-full justify-center"
              onClick={openCompanyUploadPicker}
              disabled={companyUploadSubmitting || !selectedSeasonId}
            >
              {companyUploadSubmitting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Upload size={15} />
              )}
              {companyUploadSubmitting ? "Processing file..." : "Upload file"}
            </button>
          </div>
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
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-lg font-bold text-slate-900">
                          {company.companyName}
                        </h2>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            dismissActionFlushbar();
                            openAddRoleModal(company);
                          }}
                          className="btn btn-secondary btn-sm"
                          aria-label="Add role"
                        >
                          <Plus size={15} />
                          Add role
                        </button>
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
                          <div className="grid grid-cols-1 gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide md:grid-cols-[1.9fr_1fr_0.8fr_1.1fr] md:items-center">
                            <p>Role</p>
                            <div className="flex items-center justify-center">
                              <p>
                                {company.season.seasonType === "intern"
                                  ? "Stipend"
                                  : "Package"}
                              </p>
                            </div>
                            <div className="flex items-center justify-center">
                              <p>Students</p>
                            </div>
                            <div className="flex items-center justify-center">
                              <p>Actions</p>
                            </div>
                          </div>
                          <div className="space-y-2 p-2">
                            {company.drives.map((drive) => {
                              const hasDriveStudents =
                                drive.studentEntryNumbers.length > 0;
                              const defaultUnit =
                                getCompensationUnitFromCanonical(
                                  company.season.seasonType,
                                  drive.compensationAmount,
                                );
                              const selectedUnit = normalizeCompensationUnit(
                                company.season.seasonType,
                                compensationUnitByDrive[drive.id] ??
                                  defaultUnit,
                              );
                              const currentCompensationText =
                                drive.compensationAmount !== null
                                  ? toCompensationDraftValue(
                                      canonicalToInputCompensation(
                                        company.season.seasonType,
                                        drive.compensationAmount,
                                        selectedUnit,
                                      ),
                                    )
                                  : "";
                              const draftCompensationText =
                                stipendDraftByDrive[drive.id] ??
                                currentCompensationText;
                              const isEditingCompensation = Boolean(
                                editingStipendByDrive[drive.id],
                              );
                              const draftCanonicalValue =
                                parseCanonicalCompensationFromDraft(
                                  company.season.seasonType,
                                  draftCompensationText,
                                  selectedUnit,
                                );
                              const currentNumber =
                                drive.compensationAmount !== null
                                  ? Number(drive.compensationAmount)
                                  : null;
                              const compensationChanged =
                                (draftCanonicalValue === null &&
                                  currentNumber !== null) ||
                                (typeof draftCanonicalValue === "number" &&
                                  currentNumber === null) ||
                                draftCanonicalValue === "invalid" ||
                                (typeof draftCanonicalValue === "number" &&
                                  currentNumber !== null &&
                                  Number(draftCanonicalValue.toFixed(2)) !==
                                    Number(currentNumber.toFixed(2)));
                              return (
                                <div
                                  key={drive.id}
                                  className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 px-3 py-2 md:grid-cols-[1.9fr_1fr_0.8fr_1.1fr] md:items-center"
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
                                        <select
                                          className="input-base w-16 sm:w-20 border-2 border-[#93C5FD] bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 focus:border-[#2563EB]"
                                          value={selectedUnit}
                                          onChange={(event) => {
                                            const nextUnit =
                                              normalizeCompensationUnit(
                                                company.season.seasonType,
                                                event.target
                                                  .value as CompensationInputUnit,
                                              );

                                            setCompensationUnitByDrive(
                                              (prev) => ({
                                                ...prev,
                                                [drive.id]: nextUnit,
                                              }),
                                            );

                                            const canonicalValue =
                                              parseCanonicalCompensationFromDraft(
                                                company.season.seasonType,
                                                draftCompensationText,
                                                selectedUnit,
                                              );

                                            if (
                                              typeof canonicalValue === "number"
                                            ) {
                                              const nextInputValue =
                                                canonicalToInputCompensation(
                                                  company.season.seasonType,
                                                  canonicalValue,
                                                  nextUnit,
                                                );
                                              setStipendDraftByDrive(
                                                (prev) => ({
                                                  ...prev,
                                                  [drive.id]:
                                                    toCompensationDraftValue(
                                                      nextInputValue,
                                                    ),
                                                }),
                                              );
                                            }
                                          }}
                                          disabled={Boolean(
                                            savingStipendByDrive[drive.id],
                                          )}
                                        >
                                          {company.season.seasonType ===
                                          "placement" ? (
                                            <>
                                              <option value="lpa">LPA</option>
                                              <option value="cr">Cr</option>
                                            </>
                                          ) : (
                                            <>
                                              <option value="lpm">LPM</option>
                                              <option value="kpm">KPM</option>
                                            </>
                                          )}
                                        </select>
                                        {compensationChanged ? (
                                          <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={async () => {
                                              const saved =
                                                await saveDriveCompensation(
                                                  company,
                                                  drive,
                                                  selectedUnit,
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
                                            const resetUnit =
                                              getCompensationUnitFromCanonical(
                                                company.season.seasonType,
                                                drive.compensationAmount,
                                              );
                                            const resetValue =
                                              drive.compensationAmount !== null
                                                ? toCompensationDraftValue(
                                                    canonicalToInputCompensation(
                                                      company.season.seasonType,
                                                      drive.compensationAmount,
                                                      resetUnit,
                                                    ),
                                                  )
                                                : "";

                                            setCompensationUnitByDrive(
                                              (prev) => ({
                                                ...prev,
                                                [drive.id]: resetUnit,
                                              }),
                                            );
                                            setStipendDraftByDrive((prev) => ({
                                              ...prev,
                                              [drive.id]: resetValue,
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
                                          {formatCompensationValue(
                                            company.season.seasonType,
                                            drive.compensationAmount,
                                          )}
                                        </p>
                                        <button
                                          type="button"
                                          className="btn btn-secondary btn-sm px-2"
                                          onClick={() => {
                                            const nextUnit =
                                              getCompensationUnitFromCanonical(
                                                company.season.seasonType,
                                                drive.compensationAmount,
                                              );
                                            const nextDraft =
                                              drive.compensationAmount !== null
                                                ? toCompensationDraftValue(
                                                    canonicalToInputCompensation(
                                                      company.season.seasonType,
                                                      drive.compensationAmount,
                                                      nextUnit,
                                                    ),
                                                  )
                                                : "";

                                            setCompensationUnitByDrive(
                                              (prev) => ({
                                                ...prev,
                                                [drive.id]: nextUnit,
                                              }),
                                            );
                                            setStipendDraftByDrive((prev) => ({
                                              ...prev,
                                              [drive.id]: nextDraft,
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

                                  <div className="flex flex-wrap justify-center gap-1">
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
                                      title={
                                        uploadingStudentByDrive[drive.id]
                                          ? "Uploading..."
                                          : "Upload List"
                                      }
                                      aria-label={
                                        uploadingStudentByDrive[drive.id]
                                          ? "Uploading student list"
                                          : "Upload student list"
                                      }
                                    >
                                      <Upload size={15} />
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
                                      title={
                                        comparingAttendanceByDrive[drive.id]
                                          ? "Processing attendance..."
                                          : "Attendance"
                                      }
                                      aria-label={
                                        comparingAttendanceByDrive[drive.id]
                                          ? "Processing attendance"
                                          : "Compare attendance"
                                      }
                                    >
                                      <FileSpreadsheet size={15} />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        openStudentMailModal(company, drive)
                                      }
                                      className="btn btn-secondary btn-sm"
                                      title="Mail Students"
                                      aria-label="Mail students"
                                    >
                                      <Users size={15} />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleCopyDriveDetails(
                                          company,
                                          drive,
                                        )
                                      }
                                      className="btn btn-secondary btn-sm"
                                      title={
                                        copiedDriveActionKey ===
                                        `copy:${drive.id}`
                                          ? "Copied"
                                          : "Copy Details"
                                      }
                                      aria-label={
                                        copiedDriveActionKey ===
                                        `copy:${drive.id}`
                                          ? "Copied drive details"
                                          : "Copy drive details"
                                      }
                                    >
                                      {copiedDriveActionKey ===
                                      `copy:${drive.id}` ? (
                                        <Check size={15} />
                                      ) : (
                                        <Copy size={15} />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          No drives available for this company-season cycle.
                        </div>
                      )}

                      <div className="flex flex-wrap justify-start gap-2 mt-5">
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
                            openCallModal(company);
                          }}
                          className="btn btn-primary btn-sm"
                          aria-label="Call company contact"
                        >
                          <PhoneCall size={15} />
                          Call
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
                          className="btn btn-primary btn-sm"
                          aria-label="Schedule event"
                        >
                          <CalendarPlus size={15} />
                          Schedule
                        </button>
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
                            openCompanyMailModal(company);
                          }}
                          className="btn btn-primary btn-sm"
                          aria-label="Send company mail"
                        >
                          <Mail size={15} />
                          Mail
                        </button>
                        <button
                          type="button"
                          onClick={() => openGoogleForm(company)}
                          className="btn btn-primary btn-sm"
                          aria-label="Open prefilled Google form"
                        >
                          <ExternalLink size={15} />
                          Form
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
        isOpen={Boolean(addRoleCompany)}
        onClose={() => closeAddRoleModal()}
        title={
          addRoleCompany
            ? `Add Role - ${addRoleCompany.companyName}`
            : "Add Role"
        }
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => closeAddRoleModal()}
              disabled={addRoleSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void submitAddRole()}
              disabled={addRoleSubmitting || !addRoleTitle.trim()}
            >
              {addRoleSubmitting ? "Adding..." : "Add role"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Role title
            </label>
            <input
              className="input-base"
              value={addRoleTitle}
              onChange={(event) => setAddRoleTitle(event.target.value)}
              placeholder="e.g. SDE Intern"
              disabled={addRoleSubmitting}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {addRoleCompany?.season.seasonType === "intern"
                ? "Stipend"
                : "Package"}{" "}
              (optional)
            </label>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                className="input-base"
                value={addRoleCompensation}
                onChange={(event) => setAddRoleCompensation(event.target.value)}
                placeholder="e.g. 12"
                disabled={addRoleSubmitting}
              />
              <select
                className="input-base min-w-20"
                value={addRoleCompensationUnit}
                onChange={(event) =>
                  setAddRoleCompensationUnit(
                    event.target.value as CompensationInputUnit,
                  )
                }
                disabled={addRoleSubmitting}
              >
                {addRoleCompany?.season.seasonType === "placement" ? (
                  <>
                    <option value="lpa">LPA</option>
                    <option value="cr">Cr</option>
                  </>
                ) : (
                  <>
                    <option value="lpm">LPM</option>
                    <option value="kpm">KPM</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(callCompany)}
        onClose={closeCallModal}
        title={callCompany ? `Call - ${callCompany.companyName}` : "Call"}
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={closeCallModal}
            >
              Cancel
            </button>
            <a
              href={
                selectedCallContact?.phones[0]
                  ? `tel:${selectedCallContact.phones[0]}`
                  : undefined
              }
              className={`btn btn-primary btn-sm ${!selectedCallContact?.phones[0] ? "pointer-events-none opacity-45" : ""}`}
            >
              <PhoneCall size={14} />
              Call Now
            </a>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Contact
            </label>
            <select
              className="input-base"
              value={callContactId}
              onChange={(event) => setCallContactId(event.target.value)}
            >
              <option value="">Select a contact</option>
              {(callCompany?.contacts ?? []).map(
                (contact: ConfirmedContact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                    {contact.designation ? ` (${contact.designation})` : ""}
                  </option>
                ),
              )}
            </select>
          </div>
          {selectedCallContact ? (
            <div className="space-y-1 rounded-lg border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">
                {selectedCallContact.name}
              </p>
              <p className="text-xs text-slate-500">
                {selectedCallContact.designation ?? "No designation available"}
              </p>
              {selectedCallContact.phones.length > 0 ? (
                selectedCallContact.phones.map((phone) => (
                  <a
                    key={phone}
                    href={`tel:${phone}`}
                    className="flex items-center gap-2 text-sm font-medium text-[#1D4ED8] hover:underline"
                  >
                    <PhoneCall size={13} />
                    {phone}
                  </a>
                ))
              ) : (
                <p className="text-xs text-slate-500">
                  No phone number available for this contact.
                </p>
              )}
            </div>
          ) : (
            <p className="py-2 text-center text-xs text-slate-400">
              Select a contact to see phone numbers.
            </p>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(mailCompany)}
        onClose={() => closeCompanyMailModal()}
        title={
          mailCompany ? `Send Mail - ${mailCompany.companyName}` : "Send Mail"
        }
        size="lg"
        bodyClassName="mail-scroll overflow-y-scroll"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => closeCompanyMailModal()}
              disabled={companyMailSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void submitCompanyMail()}
              disabled={
                companyMailSubmitting ||
                parseRecipientInput(mailToRecipients).length === 0 ||
                (mailRequestType === "template"
                  ? !mailTemplateId
                  : !mailSubject.trim() || !htmlToPlainText(mailBody))
              }
            >
              {companyMailSubmitting ? "Queueing..." : "Queue Mail"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Contact
            </label>
            <select
              className="input-base"
              value={mailContactId}
              onChange={(event) => {
                const nextContactId = event.target.value;
                setMailContactId(nextContactId);

                const contact =
                  mailCompany?.contacts.find(
                    (candidate) => candidate.id === nextContactId,
                  ) ?? null;

                if (contact) {
                  setMailToRecipients((current) => {
                    const existing = parseRecipientInput(current);
                    const next = Array.from(
                      new Set([...contact.emails, ...existing]),
                    );
                    return next.join(", ");
                  });
                }
              }}
            >
              <option value="">Select a contact</option>
              {(mailCompany?.contacts ?? []).map(
                (contact: ConfirmedContact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                    {contact.designation ? ` (${contact.designation})` : ""}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              To
            </label>
            <input
              className="input-base"
              value={mailToRecipients}
              onChange={(event) => setMailToRecipients(event.target.value)}
              placeholder="Add recipient emails separated by commas"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              CC
            </label>
            <input
              className="input-base"
              value={mailCcRecipients}
              onChange={(event) => setMailCcRecipients(event.target.value)}
              placeholder="Add CC emails separated by commas (optional)"
            />
          </div>

          <div className="flex gap-2">
            {(["template", "custom"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setMailRequestType(type)}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium ${mailRequestType === type ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]" : "border-slate-200 bg-white text-slate-600"}`}
              >
                {type === "template" ? "Template" : "Custom"}
              </button>
            ))}
          </div>

          {mailRequestType === "template" ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Template
              </label>
              <select
                className="input-base"
                value={mailTemplateId}
                onChange={(event) => setMailTemplateId(event.target.value)}
              >
                <option value="">Select a template</option>
                {mailTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <input
                className="input-base"
                value={mailSubject}
                onChange={(event) => setMailSubject(event.target.value)}
                placeholder="Email subject"
              />
              <RichTextEditor
                value={mailBody}
                onChange={setMailBody}
                enterKeyMode="lineBreak"
                placeholder="Write the email content"
              />
            </>
          )}
          <MailAttachmentInput
            value={mailAttachments}
            onChange={setMailAttachments}
            disabled={companyMailSubmitting}
            maxFiles={6}
          />
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>
              Company mails are queued for approval before dispatch, matching
              the outreach flow.
            </span>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(studentMailCompany && studentMailDrive)}
        onClose={() => closeStudentMailModal()}
        title={
          studentMailCompany && studentMailDrive
            ? `Mail Students - ${studentMailCompany.companyName} - ${studentMailDrive.title}`
            : "Mail Students"
        }
        size="lg"
        bodyClassName="mail-scroll overflow-y-scroll"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => closeStudentMailModal()}
              disabled={studentMailSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void submitStudentMailRequest()}
              disabled={
                studentMailSubmitting ||
                studentMailToEmails.length === 0 ||
                !studentMailSubject.trim() ||
                !studentMailBody.trim()
              }
            >
              {studentMailSubmitting ? "Queueing..." : "Queue Mail"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              To
            </label>
            <div className="mail-scroll h-24 overflow-y-scroll overscroll-contain rounded-lg border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-2 text-sm text-slate-700">
              {studentMailToEmails.length > 0 ? (
                <ul className="space-y-1">
                  {studentMailToEmails.map((email) => (
                    <li key={email} className="break-all">
                      {email}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500">No recipients available.</p>
              )}
            </div>
          </div>

          <input
            className="input-base"
            value={studentMailSubject}
            onChange={(event) => setStudentMailSubject(event.target.value)}
            placeholder="Email subject"
            disabled={studentMailSubmitting}
          />

          <RichTextEditor
            value={studentMailBody}
            onChange={setStudentMailBody}
            enterKeyMode="lineBreak"
            placeholder="Write the email content"
          />

          <MailAttachmentInput
            value={studentMailAttachments}
            onChange={setStudentMailAttachments}
            disabled={studentMailSubmitting}
            maxFiles={6}
          />

          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>
              Student mails are queued for approval before dispatch, matching
              the outreach flow.
            </span>
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
        isOpen={companyUploadInstructionOpen}
        onClose={closeCompanyUploadInstruction}
        title="Confirmed Company Upload"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={closeCompanyUploadInstruction}
              disabled={companyUploadSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => void downloadCompanyUploadTemplate()}
              disabled={companyUploadSubmitting}
            >
              <FileSpreadsheet size={15} />
              Download template
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={continueToCompanyUpload}
              disabled={companyUploadSubmitting}
            >
              Continue to upload
            </button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-slate-700">
          <p>
            Download the template first if you want a clean file with the
            supported columns for confirmed-company processing.
          </p>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">Supported columns</p>
            <p className="mt-1 text-xs text-slate-600">
              Required: <span className="font-semibold">Roll Number</span> and{" "}
              <span className="font-semibold">Placed in Company</span>
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Optional but recommended:{" "}
              <span className="font-semibold">Job Profile Title</span>,{" "}
              <span className="font-semibold">CTC</span>, and{" "}
              <span className="font-semibold">Placement Status</span>
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(companyUploadPreview)}
        onClose={closeCompanyUploadPreview}
        title={
          companyUploadPreview
            ? `Confirmed Company Upload Review - ${companyUploadPreview.fileName}`
            : "Confirmed Company Upload Review"
        }
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => closeCompanyUploadPreview()}
              disabled={companyUploadSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={proceedCompanyUploadPreview}
              disabled={
                companyUploadSubmitting ||
                unresolvedUploadedCompanies.length > 0
              }
            >
              Proceed
            </button>
          </>
        }
      >
        {companyUploadPreview ? (
          <div className="space-y-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <p>
                Sheets parsed:{" "}
                <span className="font-semibold">
                  {companyUploadPreview.matchedSheetNames.join(", ")}
                </span>
              </p>
              <p>
                Student rows used:{" "}
                <span className="font-semibold text-emerald-700">
                  {companyUploadPreview.parsedStudentRows}
                </span>{" "}
                | Skipped rows:{" "}
                <span className="font-semibold text-amber-700">
                  {companyUploadPreview.skippedStudentRows}
                </span>
              </p>
              <p>
                Uploaded companies:{" "}
                <span className="font-semibold">
                  {companyUploadPreview.uploadedCompanyCount}
                </span>{" "}
                | Auto-matched:{" "}
                <span className="font-semibold text-emerald-700">
                  {companyUploadPreview.autoMatchedCount}
                </span>{" "}
                | Needs review:{" "}
                <span className="font-semibold text-rose-700">
                  {companyUploadPreview.unmatchedCompanies.length}
                </span>
              </p>
              <p>
                Proceed status:{" "}
                <span
                  className={`font-semibold ${
                    unresolvedUploadedCompanies.length === 0
                      ? "text-emerald-700"
                      : "text-amber-700"
                  }`}
                >
                  {unresolvedUploadedCompanies.length === 0
                    ? "Ready to proceed"
                    : `${unresolvedUploadedCompanies.length} companies still need matching`}
                </span>
              </p>
            </div>

            {companyUploadPreview.unmatchedCompanies.length > 0 ? (
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Unmatched company names
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review these names and map them to an existing confirmed
                    company before proceeding. Nothing is written yet.
                  </p>
                </div>

                <div className="max-h-[26rem] space-y-3 overflow-auto pr-1">
                  {companyUploadPreview.unmatchedCompanies.map((company) => {
                    const selectedCompanyId =
                      manualCompanyMatches[company.uploadedCompanyName] ?? "";

                    return (
                      <div
                        key={company.uploadedCompanyName}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {company.uploadedCompanyName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {company.uniqueEntryCount} students across{" "}
                              {company.rowCount} rows
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Sheets: {company.sheets.join(", ")}
                            </p>
                            {company.roles.length > 0 ? (
                              <p className="mt-1 text-xs text-slate-500">
                                Roles: {company.roles.slice(0, 4).join(", ")}
                                {company.roles.length > 4 ? "..." : ""}
                              </p>
                            ) : null}
                          </div>

                          <div className="w-full lg:w-72">
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                              Match to confirmed company
                            </label>
                            <select
                              value={selectedCompanyId}
                              onChange={(event) =>
                                updateManualCompanyMatch(
                                  company.uploadedCompanyName,
                                  event.target.value,
                                )
                              }
                              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#4A86E8] focus:ring-2 focus:ring-[#4A86E8]/20"
                            >
                              <option value="">Select company</option>
                              {confirmedCompanyOptions.map((option) => (
                                <option
                                  key={option.companyId}
                                  value={option.companyId}
                                >
                                  {option.companyName}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {company.suggestions.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {company.suggestions.map((suggestion) => (
                              <button
                                key={`${company.uploadedCompanyName}-${suggestion.companyId}`}
                                type="button"
                                onClick={() =>
                                  updateManualCompanyMatch(
                                    company.uploadedCompanyName,
                                    suggestion.companyId,
                                  )
                                }
                                className={`rounded-full border px-3 py-1 text-xs transition ${
                                  selectedCompanyId === suggestion.companyId
                                    ? "border-[#4A86E8] bg-[#EAF2FF] text-[#1D4ED8]"
                                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                                }`}
                                title={suggestion.reason}
                              >
                                {suggestion.companyName}{" "}
                                {`(${Math.round(suggestion.score * 100)}%)`}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                All uploaded company names were auto-matched to existing
                confirmed companies.
              </div>
            )}

            {companyUploadPreview.matchedCompanies.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  Auto-matched companies
                </h3>
                <div className="mt-3 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">
                          Uploaded Name
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">
                          Matched Company
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">
                          Confidence
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {companyUploadPreview.matchedCompanies.map((company) => (
                        <tr
                          key={company.uploadedCompanyName}
                          className="border-b border-slate-100 last:border-b-0"
                        >
                          <td className="px-3 py-2 text-slate-900">
                            {company.uploadedCompanyName}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {company.matchedCompany?.companyName ?? "-"}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {company.matchedCompany
                              ? `${Math.round(company.matchedCompany.score * 100)}%`
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
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
