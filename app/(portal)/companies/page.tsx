"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Download,
  Upload,
  FileSpreadsheet,
  Mail,
  Globe,
  ArrowRight,
  Building2,
  Info,
  Filter,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  Eye,
  PhoneCall,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import SearchBar from "@/components/ui/SearchBar";
import FilterSelect from "@/components/ui/FilterSelect";
import EmptyState from "@/components/ui/EmptyState";
import ContactModal from "../../../components/companies/ContactModal";

// --- Types -------------------------------------------------------------------
type CycleStatus =
  | "not_contacted"
  | "contacted"
  | "positive"
  | "accepted"
  | "rejected";
type CompanyPriority = "high" | "medium" | "low";

interface ApiResponse<T> {
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  error?: {
    message?: string;
    code?: string;
  };
}

type ImportMatchSuggestion = {
  companyId: string;
  companyName: string;
  slug: string;
  score: number;
  reason: string;
};

type CompanyImportPreviewRow = {
  companyName: string;
  industry: string;
  priority: "low" | "medium" | "high";
  domains: string[];
  duplicateCandidate: ImportMatchSuggestion | null;
  suggestions: ImportMatchSuggestion[];
  normalizedName: string;
};

type CompanyImportPreviewResponse = {
  fileName: string;
  totalRows: number;
  duplicateRows: number;
  newRows: number;
  rows: CompanyImportPreviewRow[];
};

interface CompanyRecord {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  website: string | null;
  priority: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  currentStatus?: CycleStatus | null;
  contactsCount?: number | null;
  assignedTo?: string | null;
  lastUpdated?: string | null;
  lastUpdatedBy?: string | null;
  updatedField?: string | null;
}

interface CompanyFormValues {
  name: string;
  industry: string;
  priority: CompanyPriority;
  website: string;
  notes: string;
}

interface Company {
  id: string;
  name: string;
  slug: string;
  industry: string;
  website?: string;
  priority: CompanyPriority;
  notes?: string;
  status: CycleStatus;
  assignedTo: string;
  lastUpdated: string;
  lastUpdatedBy: string;
  updatedField: string;
  contacts: number;
  isWishlisted?: boolean;
}

const PRIORITY_TO_NUMBER: Record<CompanyPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function numberToPriority(
  priority: number | null | undefined,
): CompanyPriority {
  if ((priority ?? 0) >= 3) {
    return "high";
  }
  if ((priority ?? 0) >= 2) {
    return "medium";
  }
  return "low";
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 255);
}

function normalizeWebsite(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function extractDomain(website: string | undefined) {
  if (!website) {
    return undefined;
  }
  try {
    return new URL(website).hostname;
  } catch {
    return undefined;
  }
}

function mapCompanyRecord(record: CompanyRecord): Company {
  const status =
    record.currentStatus &&
    STATUS_OPTIONS.some((item) => item.value === record.currentStatus)
      ? record.currentStatus
      : "not_contacted";

  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    industry: record.industry ?? "Unknown",
    website: record.website ?? undefined,
    priority: numberToPriority(record.priority),
    notes: record.notes ?? undefined,
    status,
    assignedTo: record.assignedTo ?? "Unassigned",
    lastUpdated: record.lastUpdated ?? record.updatedAt ?? record.createdAt,
    lastUpdatedBy: record.lastUpdatedBy ?? "System",
    updatedField: record.updatedField ?? "company",
    contacts: record.contactsCount ?? 0,
  };
}

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    credentials: "include",
    ...init,
  });
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

const INDUSTRY_OPTIONS = [
  { value: "IT", label: "IT" },
  { value: "Finance", label: "Finance" },
  { value: "Analytics", label: "Analytics" },
  { value: "Consulting", label: "Consulting" },
  { value: "FMCG", label: "FMCG" },
  { value: "Core Engineering", label: "Core Engineering" },
  { value: "Healthcare", label: "Healthcare" },
];
const STATUS_OPTIONS = [
  { value: "not_contacted", label: "Not Contacted" },
  { value: "contacted", label: "Contacted" },
  { value: "positive", label: "Positive" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];
const PRIORITY_OPTIONS = [
  { value: "high", label: "High Priority" },
  { value: "medium", label: "Medium Priority" },
  { value: "low", label: "Low Priority" },
];
const PRIORITY_BADGE: Record<string, React.ReactNode> = {
  high: (
    <Badge variant="danger" size="sm">
      High
    </Badge>
  ),
  medium: (
    <Badge variant="warning" size="sm">
      Medium
    </Badge>
  ),
  low: (
    <Badge variant="gray" size="sm">
      Low
    </Badge>
  ),
};

function CompaniesTableSkeleton() {
  return (
    <div className="min-w-160 p-4">
      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
        <div className="grid grid-cols-[minmax(0,2.4fr)_1fr_0.9fr_1.2fr_auto] gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className={`shimmer h-4 rounded-full ${
                index === 0
                  ? "w-20"
                  : index === 3
                    ? "w-24 justify-self-center"
                    : index === 4
                      ? "w-16 justify-self-center"
                      : "w-14"
              }`}
            />
          ))}
        </div>
        <div className="space-y-0">
          {Array.from({ length: 7 }, (_, index) => (
            <div
              key={index}
              className="grid grid-cols-[minmax(0,2.4fr)_1fr_0.9fr_1.2fr_auto] items-center gap-2 border-b border-slate-100 px-4 py-3 last:border-b-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="shimmer h-10 w-10 rounded-lg shrink-0" />
                <div className="min-w-0 space-y-2">
                  <div className="shimmer h-5 w-36 rounded-full" />
                  <div className="shimmer h-4 w-20 rounded-full" />
                </div>
              </div>
              <div className="shimmer h-5 w-20 rounded-full" />
              <div className="shimmer h-7 w-16 rounded-full" />
              <div className="shimmer h-5 w-24 rounded-full" />
              <div className="flex justify-center gap-1">
                <div className="shimmer h-10 w-10 rounded-lg" />
                <div className="shimmer h-10 w-10 rounded-lg" />
                <div className="shimmer h-10 w-10 rounded-lg" />
                <div className="shimmer h-10 w-10 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AddEditModal({
  isOpen,
  onClose,
  company,
  onSubmit,
  submitting,
  errorMessage,
}: {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  onSubmit: (values: CompanyFormValues) => Promise<void>;
  submitting: boolean;
  errorMessage: string | null;
}) {
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await onSubmit({
      name: String(formData.get("name") ?? ""),
      industry: String(formData.get("industry") ?? ""),
      priority: String(formData.get("priority") ?? "medium") as CompanyPriority,
      website: String(formData.get("website") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={company ? "Edit Company" : "Add Company"}
      size="lg"
      footer={
        <>
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            form="company-form"
            type="submit"
            disabled={submitting}
          >
            {company ? "Save Changes" : "Add Company"}
          </button>
        </>
      }
    >
      <form
        id="company-form"
        onSubmit={handleSubmit}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {errorMessage && (
          <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Company Name *
          </label>
          <input
            name="name"
            defaultValue={company?.name ?? ""}
            className="input-base"
            placeholder="e.g. Google India"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Industry
          </label>
          <select
            name="industry"
            defaultValue={company?.industry ?? ""}
            className="input-base"
          >
            <option value="">Select industry</option>
            {INDUSTRY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Priority
          </label>
          <select
            name="priority"
            defaultValue={company?.priority ?? "medium"}
            className="input-base"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Website
          </label>
          <input
            name="website"
            defaultValue={company?.website ?? ""}
            className="input-base"
            placeholder="e.g. company.com"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notes
          </label>
          <textarea
            rows={3}
            className="input-base"
            name="notes"
            defaultValue={company?.notes ?? ""}
            placeholder="Add notes about this company..."
          />
        </div>
      </form>
    </Modal>
  );
}

function DeleteModal({
  isOpen,
  onClose,
  company,
  onConfirm,
  submitting,
  errorMessage,
}: {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  onConfirm: () => Promise<void>;
  submitting: boolean;
  errorMessage: string | null;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Company"
      size="sm"
      footer={
        <>
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={() => void onConfirm()}
            disabled={submitting}
          >
            Delete Company
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}
        <p className="text-sm text-slate-600">
          Are you sure you want to delete <strong>{company?.name}</strong>? This
          action is irreversible and will create an audit log entry.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700">
          All associated contacts, assignments, and history will be permanently
          removed.
        </div>
      </div>
    </Modal>
  );
}

// --- Main Component -----------------------------------------------------------
export default function CompaniesPage() {
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [sortField, setSortField] = useState<keyof Company | null>(null);
  const [sortDir, setSortDir] = useState<"none" | "asc" | "desc">("none");
  const [page, setPage] = useState(1);
  const [addEditOpen, setAddEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [upsertingCompany, setUpsertingCompany] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState(false);
  const [creatingContact, setCreatingContact] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactTargetCompany, setContactTargetCompany] =
    useState<Company | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [toolbarMessage, setToolbarMessage] = useState<string | null>(null);
  const [toolbarError, setToolbarError] = useState<string | null>(null);
  const [exportingCompanies, setExportingCompanies] = useState(false);
  const [downloadingImportFormat, setDownloadingImportFormat] = useState(false);
  const [importingCompanies, setImportingCompanies] = useState(false);
  const [companyImportFile, setCompanyImportFile] = useState<File | null>(null);
  const [companyImportPreview, setCompanyImportPreview] =
    useState<CompanyImportPreviewResponse | null>(null);
  const [companyImportMatches, setCompanyImportMatches] = useState<
    Record<string, string>
  >({});
  const [showFilters, setShowFilters] = useState(false);
  const [updateDetails, setUpdateDetails] = useState<{
    company: Company;
    position: { left: number; top: number };
  } | null>(null);

  const PER_PAGE = 10;
  const API_LIMIT = 100;

  const fetchCompanies = async () => {
    setLoading(true);
    setListError(null);
    try {
      const allRows: CompanyRecord[] = [];
      let currentPage = 1;
      let totalPages = 1;

      while (currentPage <= totalPages) {
        const response = await requestJson<CompanyRecord[]>(
          `/api/v1/companies?page=${currentPage}&limit=${API_LIMIT}`,
        );

        const pageRows = response.data ?? [];
        allRows.push(...pageRows);

        totalPages = response.meta?.totalPages ?? currentPage;
        if (
          response.meta?.totalPages === undefined &&
          pageRows.length < API_LIMIT
        ) {
          break;
        }

        currentPage += 1;
      }

      setCompanies(allRows.map(mapCompanyRecord));
    } catch (error) {
      setListError(
        error instanceof Error ? error.message : "Failed to load companies",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCompanies();
  }, []);

  const handleAddOrEditCompany = async (values: CompanyFormValues) => {
    setModalError(null);
    setUpsertingCompany(true);
    try {
      const website = normalizeWebsite(values.website);
      const payload = {
        name: values.name.trim(),
        slug: slugify(values.name),
        industry: values.industry || undefined,
        website,
        domain: extractDomain(website),
        priority: PRIORITY_TO_NUMBER[values.priority],
        notes: values.notes.trim() || undefined,
      };

      if (!payload.name) {
        throw new Error("Company name is required");
      }

      if (selectedCompany) {
        await requestJson(`/api/v1/companies/${selectedCompany.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson("/api/v1/companies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setAddEditOpen(false);
      setSelectedCompany(null);
      await fetchCompanies();
    } catch (error) {
      setModalError(
        error instanceof Error ? error.message : "Unable to save company",
      );
    } finally {
      setUpsertingCompany(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!selectedCompany) {
      return;
    }

    setModalError(null);
    setDeletingCompany(true);
    try {
      await requestJson(`/api/v1/companies/${selectedCompany.id}`, {
        method: "DELETE",
      });
      setDeleteOpen(false);
      setSelectedCompany(null);
      await fetchCompanies();
    } catch (error) {
      setModalError(
        error instanceof Error ? error.message : "Unable to delete company",
      );
    } finally {
      setDeletingCompany(false);
    }
  };

  const handleAddContact = async (contact: {
    name?: string;
    designation?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    preferredMethod?: "email" | "phone" | "linkedin";
    notes?: string;
  }) => {
    if (!contactTargetCompany) {
      return;
    }

    setModalError(null);
    setCreatingContact(true);
    try {
      const noteParts = [contact.notes?.trim() ?? ""];
      if (contact.linkedin?.trim()) {
        noteParts.push(`LinkedIn: ${contact.linkedin.trim()}`);
      }

      await requestJson(
        `/api/v1/companies/${contactTargetCompany.id}/contacts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: (contact.name ?? "").trim(),
            designation: contact.designation?.trim() || undefined,
            emails: contact.email?.trim() ? [contact.email.trim()] : undefined,
            phones: contact.phone?.trim() ? [contact.phone.trim()] : undefined,
            preferredContactMethod: contact.preferredMethod || undefined,
            notes: noteParts.filter(Boolean).join("\n") || undefined,
          }),
        },
      );

      setContactModalOpen(false);
      setContactTargetCompany(null);
      await fetchCompanies();
    } catch (error) {
      setModalError(
        error instanceof Error ? error.message : "Unable to add contact",
      );
    } finally {
      setCreatingContact(false);
    }
  };

  const handleExportCompanies = async () => {
    setToolbarMessage(null);
    setToolbarError(null);
    setExportingCompanies(true);

    try {
      const query = new URLSearchParams();
      if (search.trim()) {
        query.set("search", search.trim());
      }
      if (industryFilter.length === 1) {
        query.set("industry", industryFilter[0]);
      }

      const response = await fetch(
        `/api/v1/companies/export${query.size > 0 ? `?${query.toString()}` : ""}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        let message = "Failed to export companies";
        try {
          const body = (await response.json()) as ApiResponse<unknown>;
          message = body.error?.message ?? message;
        } catch {
          // Ignore parse errors and use fallback message.
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("content-disposition");
      const match = contentDisposition?.match(/filename=([^;]+)/i);
      const filename = match
        ? match[1].replaceAll('"', "")
        : `companies-${new Date().toISOString().slice(0, 10)}.xlsx`;

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setToolbarMessage("Companies exported successfully");
    } catch (error) {
      setToolbarError(
        error instanceof Error ? error.message : "Failed to export companies",
      );
    } finally {
      setExportingCompanies(false);
    }
  };

  const handleImportCompaniesClick = () => {
    setToolbarMessage(null);
    setToolbarError(null);
    setImportModalOpen(true);
  };

  const handleDownloadImportFormat = async () => {
    setToolbarMessage(null);
    setToolbarError(null);
    setDownloadingImportFormat(true);

    try {
      const response = await fetch("/api/v1/companies/import-template", {
        credentials: "include",
      });

      if (!response.ok) {
        let message = "Failed to download import format";
        try {
          const body = (await response.json()) as ApiResponse<unknown>;
          message = body.error?.message ?? message;
        } catch {
          // Ignore parse errors and use fallback message.
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("content-disposition");
      const match = contentDisposition?.match(/filename=([^;]+)/i);
      const filename = match
        ? match[1].replaceAll('"', "")
        : "companies-import-format.xlsx";

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setToolbarMessage("Import format downloaded");
    } catch (error) {
      setToolbarError(
        error instanceof Error
          ? error.message
          : "Failed to download import format",
      );
    } finally {
      setDownloadingImportFormat(false);
    }
  };

  const handleUploadFilledFile = () => {
    importFileInputRef.current?.click();
  };

  const closeCompanyImportPreview = () => {
    if (importingCompanies) {
      return;
    }
    setCompanyImportPreview(null);
    setCompanyImportFile(null);
    setCompanyImportMatches({});
  };

  const updateCompanyImportMatch = (companyName: string, companyId: string) => {
    setCompanyImportMatches((current) => ({
      ...current,
      [companyName]: companyId,
    }));
  };

  const unresolvedImportDuplicates = useMemo(() => {
    if (!companyImportPreview) {
      return [];
    }

    return companyImportPreview.rows.filter(
      (row) =>
        row.suggestions.length > 0 && !companyImportMatches[row.companyName],
    );
  }, [companyImportMatches, companyImportPreview]);

  const handleImportFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    setToolbarMessage(null);
    setToolbarError(null);
    setImportingCompanies(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/v1/companies/import-preview", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const bodyText = await response.text();
      let body: ApiResponse<CompanyImportPreviewResponse> = {};

      if (bodyText) {
        try {
          body = JSON.parse(
            bodyText,
          ) as ApiResponse<CompanyImportPreviewResponse>;
        } catch {
          body = {};
        }
      }

      if (!response.ok) {
        throw new Error(body.error?.message ?? "Failed to import companies");
      }

      setCompanyImportFile(file);
      setCompanyImportPreview(body.data ?? null);
      setCompanyImportMatches(
        Object.fromEntries(
          (body.data?.rows ?? [])
            .filter((row) => row.duplicateCandidate?.companyId)
            .map((row) => [row.companyName, row.duplicateCandidate!.companyId]),
        ),
      );
    } catch (error) {
      setToolbarError(
        error instanceof Error ? error.message : "Failed to import companies",
      );
    } finally {
      setImportingCompanies(false);
    }
  };

  const handleConfirmCompanyImport = async () => {
    if (!companyImportFile || !companyImportPreview) {
      return;
    }

    setToolbarMessage(null);
    setToolbarError(null);
    setImportingCompanies(true);

    try {
      const formData = new FormData();
      formData.append("file", companyImportFile);
      formData.append("resolvedMatches", JSON.stringify(companyImportMatches));

      const response = await fetch("/api/v1/companies/import", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const bodyText = await response.text();
      let body: ApiResponse<{
        total: number;
        created: number;
        updated: number;
      }> = {};

      if (bodyText) {
        try {
          body = JSON.parse(bodyText) as ApiResponse<{
            total: number;
            created: number;
            updated: number;
          }>;
        } catch {
          body = {};
        }
      }

      if (!response.ok) {
        throw new Error(body.error?.message ?? "Failed to import companies");
      }

      const summary = body.data;
      setToolbarMessage(
        summary
          ? `Import completed: ${summary.total} rows (${summary.created} created, ${summary.updated} updated)`
          : "Import completed successfully",
      );
      closeCompanyImportPreview();
      setImportModalOpen(false);
      await fetchCompanies();
    } catch (error) {
      setToolbarError(
        error instanceof Error ? error.message : "Failed to import companies",
      );
    } finally {
      setImportingCompanies(false);
    }
  };

  const filtered = useMemo(() => {
    let data = companies;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q) ||
          (c.website ?? "").toLowerCase().includes(q),
      );
    }
    if (industryFilter.length > 0)
      data = data.filter((c) => industryFilter.includes(c.industry));
    if (priorityFilter.length > 0)
      data = data.filter((c) => priorityFilter.includes(c.priority));

    if (sortField && sortDir !== "none") {
      data = [...data].sort((a, b) => {
        const aVal = String(a[sortField]);
        const bVal = String(b[sortField]);
        const cmp = aVal.localeCompare(bVal);
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return data;
  }, [search, industryFilter, priorityFilter, sortField, sortDir, companies]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSort = (field: keyof Company) => {
    if (sortField !== field) {
      setSortField(field);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortField(null);
      setSortDir("none");
    }
    setPage(1);
  };

  const handleOpenUpdateDetails = (
    company: Company,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const popupWidth = 320;
    const minLeft = popupWidth / 2 + 12;
    const maxLeft = window.innerWidth - popupWidth / 2 - 12;
    const centerLeft = rect.left + rect.width / 2;

    setUpdateDetails({
      company,
      position: {
        left: Math.min(maxLeft, Math.max(minLeft, centerLeft)),
        top: rect.top - 10,
      },
    });
  };

  const SortIcon = ({ field }: { field: keyof Company }) => {
    if (sortField !== field || sortDir === "none") {
      return (
        <span className="flex flex-col -space-y-1">
          <ChevronUp size={9} className="text-slate-400" />
          <ChevronDown size={9} className="text-slate-400" />
        </span>
      );
    }
    return sortDir === "asc" ? (
      <ChevronUp size={12} className="text-[#2563EB]" />
    ) : (
      <ChevronDown size={12} className="text-[#2563EB]" />
    );
  };

  const activeFilterCount = industryFilter.length + priorityFilter.length;

  return (
    <div className="animate-fade-in xl:h-full pb-6 pt-6">
      <div className="card overflow-hidden min-w-0 xl:h-full flex flex-col">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-(--card-border) space-y-3">
          {(toolbarMessage || toolbarError) && (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                toolbarError
                  ? "border border-red-200 bg-red-50 text-red-700"
                  : "border border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {toolbarError ?? toolbarMessage}
            </div>
          )}
          <div className="flex items-center gap-2">
            <SearchBar
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search companies..."
              className="flex-1 min-w-0"
            />
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <button
                className={`btn btn-secondary btn-sm gap-1 shrink-0 ${
                  showFilters
                    ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]"
                    : ""
                }`}
                onClick={() => {
                  setToolbarMessage(null);
                  setToolbarError(null);
                  setShowFilters((v) => !v);
                }}
              >
                <Filter size={14} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#2563EB] text-white text-[10px] flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <div className="w-px h-5 bg-(--card-border) shrink-0" />
              <button
                className="btn btn-secondary btn-sm gap-1.5 shrink-0"
                onClick={() => void handleExportCompanies()}
                disabled={exportingCompanies || importingCompanies}
              >
                <Download size={14} />
                {exportingCompanies ? "Exporting..." : "Export"}
              </button>
              <button
                className="btn btn-secondary btn-sm gap-1.5 shrink-0"
                onClick={handleImportCompaniesClick}
                disabled={importingCompanies || exportingCompanies}
              >
                <Upload size={14} />
                {importingCompanies ? "Importing..." : "Import"}
              </button>
              <input
                ref={importFileInputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={(event) => {
                  void handleImportFileChange(event);
                }}
              />
              <button
                className="btn btn-primary btn-sm gap-1.5 shrink-0"
                onClick={() => {
                  setModalError(null);
                  setSelectedCompany(null);
                  setAddEditOpen(true);
                }}
              >
                <Plus size={14} />
                Add
              </button>
            </div>
          </div>

          {/* Filter row */}
          {showFilters && (
            <div className="flex items-center gap-2 pt-1 pb-0.5 w-full">
              <FilterSelect
                multiple
                value={industryFilter}
                onChange={(v) => {
                  setIndustryFilter(v);
                  setPage(1);
                }}
                options={INDUSTRY_OPTIONS}
                placeholder="Industry"
                className="flex-1 min-w-0"
              />
              <FilterSelect
                multiple
                value={priorityFilter}
                onChange={(v) => {
                  setPriorityFilter(v);
                  setPage(1);
                }}
                options={PRIORITY_OPTIONS}
                placeholder="Priority"
                className="flex-1 min-w-0"
              />
              {activeFilterCount > 0 && (
                <button
                  className="btn btn-ghost btn-sm text-slate-500 hover:text-slate-700 shrink-0"
                  onClick={() => {
                    setIndustryFilter([]);
                    setPriorityFilter([]);
                    setPage(1);
                  }}
                >
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <CompaniesTableSkeleton />
          ) : listError ? (
            <EmptyState
              icon={Building2}
              title="Unable to load companies"
              description={listError}
            />
          ) : paginated.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No companies found"
              description="Try adjusting your search or filters"
            />
          ) : (
            <table className="w-full text-sm min-w-160">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-100">
                  {(
                    [
                      "name",
                      "industry",
                      "priority",
                      "lastUpdated",
                    ] as (keyof Company)[]
                  ).map((f) => (
                    <th
                      key={f}
                      className={`px-4 py-3 ${f === "lastUpdated" ? "text-center" : "text-left"} text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap group cursor-pointer select-none`}
                      onClick={() => handleSort(f)}
                    >
                      <span
                        className={`flex items-center ${f === "lastUpdated" ? "justify-center" : "justify-left"} gap-1`}
                      >
                        {f === "name"
                          ? "Company"
                          : f === "lastUpdated"
                            ? "Last Updated"
                            : f.charAt(0).toUpperCase() + f.slice(1)}
                        <SortIcon field={f} />
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginated.map((company) => (
                  <tr
                    key={company.id}
                    className="table-row-hover transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/companies/${company.id}`}
                        className="flex items-center gap-3 group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center text-[#2563EB] font-semibold text-xs shrink-0">
                          {company.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 group-hover:text-[#2563EB] transition-colors truncate">
                            {company.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {company.contacts} contacts
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {company.industry}
                    </td>
                    <td className="px-4 py-3">
                      {PRIORITY_BADGE[company.priority]}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <span>
                          {new Date(company.lastUpdated).toLocaleString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center w-5 h-5 rounded border border-slate-200 text-slate-500 hover:text-[#2563EB] hover:border-[#BFDBFE] hover:bg-[#EFF6FF] transition-colors"
                          aria-label="Show update details"
                          title="Show update details"
                          onClick={(event) =>
                            handleOpenUpdateDetails(company, event)
                          }
                        >
                          <Info size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1 relative">
                        <Link
                          href={`/companies/${company.id}`}
                          className="btn btn-ghost btn-sm btn-icon text-slate-500 hover:text-[#2563EB]"
                          title="View"
                        >
                          <Eye size={15} />
                        </Link>
                        <button
                          className="btn btn-ghost btn-sm btn-icon text-slate-500 hover:text-[#2563EB]"
                          title="Edit"
                          onClick={() => {
                            setModalError(null);
                            setSelectedCompany(company);
                            setAddEditOpen(true);
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm btn-icon text-slate-500 hover:text-[#2563EB]"
                          title="Add Contact"
                          onClick={() => {
                            setModalError(null);
                            setContactTargetCompany(company);
                            setContactModalOpen(true);
                          }}
                        >
                          <span className="relative inline-flex items-center justify-center">
                            <PhoneCall size={14} />
                            <Plus
                              size={9}
                              className="absolute -right-1 -bottom-1 bg-white rounded-full"
                            />
                          </span>
                        </button>
                        <button
                          className="btn btn-ghost btn-sm btn-icon text-slate-500 hover:text-[#2563EB]"
                          title="Delete"
                          onClick={() => {
                            setModalError(null);
                            setSelectedCompany(company);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            {filtered.length} {filtered.length === 1 ? "company" : "companies"}
            {totalPages > 1 && (
              <>
                {" "}
                &mdash; page {page} of {totalPages}
              </>
            )}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                className="btn btn-secondary btn-sm btn-icon"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    className={`btn btn-sm w-8 h-8 p-0 justify-center ${page === p ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                className="btn btn-secondary btn-sm btn-icon"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {updateDetails && (
        <>
          <button
            type="button"
            aria-label="Close update details"
            className="fixed inset-0 z-40"
            onClick={() => setUpdateDetails(null)}
          />
          <div
            className="fixed z-50 w-80 max-w-[calc(100vw-24px)] animate-fade-in-opacity"
            style={{
              left: `${updateDetails.position.left}px`,
              top: `${updateDetails.position.top}px`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-4">
              <div className="pb-3 mb-3 border-b border-slate-100 flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-slate-900">
                  Last Update Details
                </h4>
                <button
                  type="button"
                  className="text-xs text-slate-500 hover:text-slate-700"
                  onClick={() => setUpdateDetails(null)}
                >
                  Close
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3">
                  <div className="w-20 shrink-0">
                    <span className="text-xs font-medium text-slate-500">
                      Date
                    </span>
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-slate-900">
                      {new Date(
                        updateDetails.company.lastUpdated,
                      ).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-20 shrink-0">
                    <span className="text-xs font-medium text-slate-500">
                      Updated by
                    </span>
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-slate-900 font-medium">
                      {updateDetails.company.lastUpdatedBy}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-20 shrink-0">
                    <span className="text-xs font-medium text-slate-500">
                      Field
                    </span>
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-mono text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded">
                      {updateDetails.company.updatedField}
                    </span>
                  </div>
                </div>
              </div>

              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                <div className="border-[6px] border-transparent border-t-white drop-shadow-sm"></div>
                <div className="absolute -top-1.75 left-1/2 -translate-x-1/2">
                  <div className="border-[7px] border-transparent border-t-slate-200"></div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <AddEditModal
        isOpen={addEditOpen}
        onClose={() => {
          setAddEditOpen(false);
          setModalError(null);
        }}
        company={selectedCompany}
        onSubmit={handleAddOrEditCompany}
        submitting={upsertingCompany}
        errorMessage={modalError}
      />
      <DeleteModal
        isOpen={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setModalError(null);
        }}
        company={selectedCompany}
        onConfirm={handleDeleteCompany}
        submitting={deletingCompany}
        errorMessage={modalError}
      />
      <Modal
        isOpen={importModalOpen}
        onClose={() => {
          if (importingCompanies || downloadingImportFormat) {
            return;
          }
          setImportModalOpen(false);
        }}
        title="Import Companies"
        size="md"
        footer={
          <button
            className="btn btn-secondary"
            onClick={() => setImportModalOpen(false)}
            disabled={importingCompanies || downloadingImportFormat}
          >
            Close
          </button>
        }
      >
        <div className="space-y-5">
          <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3">
            <p className="text-sm font-semibold text-[#1D4ED8]">
              2-step import flow
            </p>
            <p className="mt-1 text-sm text-slate-700">
              Download the template, fill the rows, then upload the same Excel
              file.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Step 1
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  Download import template
                </p>
              </div>
              <FileSpreadsheet size={18} className="text-[#2563EB] shrink-0" />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              The template already contains the exact required columns and an
              example row.
            </p>
            <button
              className="btn btn-secondary btn-sm mt-3"
              onClick={() => void handleDownloadImportFormat()}
              disabled={downloadingImportFormat || importingCompanies}
            >
              {downloadingImportFormat
                ? "Downloading template..."
                : "Download .xlsx template"}
            </button>
          </div>

          <div className="flex items-center justify-center text-slate-400">
            <ArrowRight size={16} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Step 2
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  Upload filled template
                </p>
              </div>
              <Upload size={18} className="text-[#2563EB] shrink-0" />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Upload only Excel files (.xlsx/.xls) created from the provided
              template.
            </p>
            <button
              className="btn btn-primary btn-sm mt-3"
              onClick={handleUploadFilledFile}
              disabled={importingCompanies || downloadingImportFormat}
            >
              {importingCompanies ? "Uploading file..." : "Upload filled file"}
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 space-y-2">
            <p className="font-semibold text-slate-800">Required columns</p>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-md bg-white border border-slate-200 px-2 py-1">
                company name
              </span>
              <span className="rounded-md bg-white border border-slate-200 px-2 py-1">
                industry
              </span>
              <span className="rounded-md bg-white border border-slate-200 px-2 py-1">
                priority
              </span>
              <span className="rounded-md bg-white border border-slate-200 px-2 py-1">
                domain
              </span>
            </div>
            <p className="flex items-center gap-1.5">
              <Globe size={13} className="text-slate-500" />
              Priority values must be exactly: low, medium, high.
            </p>
            <p className="flex items-center gap-1.5">
              <Mail size={13} className="text-slate-500" />
              Domain column accepts email (for example hr@acme.com) or plain
              domain (acme.com).
            </p>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={Boolean(companyImportPreview)}
        onClose={closeCompanyImportPreview}
        title={
          companyImportPreview
            ? `Review Company Import - ${companyImportPreview.fileName}`
            : "Review Company Import"
        }
        size="lg"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={closeCompanyImportPreview}
              disabled={importingCompanies}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => void handleConfirmCompanyImport()}
              disabled={importingCompanies}
            >
              {importingCompanies ? "Importing..." : "Confirm import"}
            </button>
          </>
        }
      >
        {companyImportPreview ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p>
                Total rows:{" "}
                <span className="font-semibold">
                  {companyImportPreview.totalRows}
                </span>{" "}
                | Possible duplicates:{" "}
                <span className="font-semibold text-amber-700">
                  {companyImportPreview.duplicateRows}
                </span>{" "}
                | New companies:{" "}
                <span className="font-semibold text-emerald-700">
                  {companyImportPreview.newRows}
                </span>
              </p>
            </div>

            <div className="max-h-128 space-y-3 overflow-auto pr-1">
              {companyImportPreview.rows.map((row) => {
                const selectedMatchId =
                  companyImportMatches[row.companyName] ?? "";
                const hasSuggestions = row.suggestions.length > 0;

                return (
                  <div
                    key={`${row.companyName}-${row.industry}`}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {row.companyName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {row.industry} | {row.priority} priority
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Domains:{" "}
                          {row.domains.length > 0
                            ? row.domains.join(", ")
                            : "-"}
                        </p>
                        {!hasSuggestions ? (
                          <p className="mt-2 text-xs font-semibold text-emerald-700">
                            No close duplicate found. This row will create a new
                            company.
                          </p>
                        ) : row.duplicateCandidate ? (
                          <p className="mt-2 text-xs font-semibold text-amber-700">
                            Suggested duplicate:{" "}
                            {row.duplicateCandidate.companyName} (
                            {Math.round(row.duplicateCandidate.score * 100)}%)
                          </p>
                        ) : null}
                      </div>

                      {hasSuggestions ? (
                        <div className="w-full lg:w-72">
                          <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Use existing company
                          </label>
                          <select
                            value={selectedMatchId}
                            onChange={(event) =>
                              updateCompanyImportMatch(
                                row.companyName,
                                event.target.value,
                              )
                            }
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#4A86E8] focus:ring-2 focus:ring-[#4A86E8]/20"
                          >
                            <option value="">Create as new company</option>
                            {row.suggestions.map((suggestion) => (
                              <option
                                key={`${row.companyName}-${suggestion.companyId}`}
                                value={suggestion.companyId}
                              >
                                {suggestion.companyName} (
                                {Math.round(suggestion.score * 100)}%)
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                    </div>

                    {hasSuggestions ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {row.suggestions.map((suggestion) => (
                          <button
                            key={`${row.companyName}-${suggestion.companyId}-chip`}
                            type="button"
                            onClick={() =>
                              updateCompanyImportMatch(
                                row.companyName,
                                suggestion.companyId,
                              )
                            }
                            className={`rounded-full border px-3 py-1 text-xs transition ${
                              selectedMatchId === suggestion.companyId
                                ? "border-[#4A86E8] bg-[#EAF2FF] text-[#1D4ED8]"
                                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                            }`}
                            title={suggestion.reason}
                          >
                            {suggestion.companyName} (
                            {Math.round(suggestion.score * 100)}%)
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {unresolvedImportDuplicates.length > 0 ? (
              <p className="text-xs text-slate-500">
                Suggested duplicate matches are pre-selected. Change any row to
                “Create as new company” if you want to keep it separate.
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => {
          setContactModalOpen(false);
          setContactTargetCompany(null);
          setModalError(null);
        }}
        contact={null}
        title={
          contactTargetCompany
            ? `Add Contact - ${contactTargetCompany.name}`
            : "Add Contact"
        }
        onSubmit={handleAddContact}
        submitting={creatingContact}
        errorMessage={modalError}
      />
    </div>
  );
}
