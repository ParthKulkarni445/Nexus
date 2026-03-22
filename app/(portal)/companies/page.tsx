"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Download,
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
import StatusBadge from "@/components/ui/StatusBadge";
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
    <div className="p-4 space-y-3 min-w-160">
      {Array.from({ length: 7 }, (_, index) => (
        <div
          key={index}
          className="grid grid-cols-[minmax(0,2.2fr)_1fr_0.8fr_0.9fr_1fr_1.1fr_0.9fr] items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="shimmer h-8 w-8 rounded-lg shrink-0" />
            <div className="min-w-0 space-y-2">
              <div className="shimmer h-4 w-32 rounded-full" />
              <div className="shimmer h-3 w-20 rounded-full" />
            </div>
          </div>
          <div className="shimmer h-4 w-20 rounded-full" />
          <div className="shimmer h-6 w-16 rounded-full" />
          <div className="shimmer h-6 w-24 rounded-full" />
          <div className="shimmer h-4 w-24 rounded-full" />
          <div className="flex justify-center">
            <div className="shimmer h-4 w-24 rounded-full" />
          </div>
          <div className="flex justify-center gap-2">
            <div className="shimmer h-8 w-8 rounded-lg" />
            <div className="shimmer h-8 w-8 rounded-lg" />
            <div className="shimmer h-8 w-8 rounded-lg" />
          </div>
        </div>
      ))}
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
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [industryFilter, setIndustryFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);
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
    if (statusFilter.length > 0)
      data = data.filter((c) => statusFilter.includes(c.status));
    if (industryFilter.length > 0)
      data = data.filter((c) => industryFilter.includes(c.industry));
    if (priorityFilter.length > 0)
      data = data.filter((c) => priorityFilter.includes(c.priority));
    if (assigneeFilter.length > 0)
      data = data.filter((c) => assigneeFilter.includes(c.assignedTo));

    if (sortField && sortDir !== "none") {
      data = [...data].sort((a, b) => {
        const aVal = String(a[sortField]);
        const bVal = String(b[sortField]);
        const cmp = aVal.localeCompare(bVal);
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return data;
  }, [
    search,
    statusFilter,
    industryFilter,
    priorityFilter,
    assigneeFilter,
    sortField,
    sortDir,
    companies,
  ]);

  const coordinatorOptions = useMemo(() => {
    const values = new Set(companies.map((company) => company.assignedTo));
    values.add("Unassigned");

    return Array.from(values)
      .filter(Boolean)
      .sort((a, b) => {
        if (a === "Unassigned") {
          return 1;
        }
        if (b === "Unassigned") {
          return -1;
        }
        return a.localeCompare(b);
      })
      .map((value) => ({ value, label: value }));
  }, [companies]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const stats = useMemo(
    () => ({
      total: companies.length,
      accepted: companies.filter((c) => c.status === "accepted").length,
      positive: companies.filter(
        (c) => c.status === "positive" || c.status === "accepted",
      ).length,
      notContacted: companies.filter((c) => c.status === "not_contacted")
        .length,
    }),
    [companies],
  );

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

  const activeFilterCount =
    statusFilter.length +
    industryFilter.length +
    priorityFilter.length +
    assigneeFilter.length;

  return (
    <div className="animate-fade-in xl:h-full pb-6 pt-6">
      <div className="flex flex-col xl:flex-row gap-5 xl:items-start xl:h-full">
        {/* -- Left: Statistics card --------------------------- */}
        {(() => {
          const statItems = [
            {
              label: "Total",
              value: stats.total,
              sub: "Companies",
              accent: "#2563EB",
            },
            {
              label: "Accepted",
              value: stats.accepted,
              sub: "Confirmed JD",
              accent: "#2563EB",
            },
            {
              label: "Positive",
              value: stats.positive,
              sub: "Responded well",
              accent: "#2563EB",
            },
            {
              label: "Pending",
              value: stats.notContacted,
              sub: "Not contacted",
              accent: "#2563EB",
            },
          ];
          const r = 46,
            circ = 2 * Math.PI * r;
          const filled =
            stats.total > 0 ? (stats.accepted / stats.total) * circ : 0;
          return (
            <div className="card w-full xl:w-56 xl:shrink-0 xl:h-full xl:flex xl:flex-col overflow-hidden">
              {/* Header */}
              <div
                className="px-4 py-3 border-b"
                style={{
                  borderColor: "var(--card-border)",
                  background: "#2563EB",
                }}
              >
                <p
                  className="text-xs text-center font-semibold uppercase tracking-widest"
                  style={{ color: "#FFFFFF" }}
                >
                  Statistics
                </p>
              </div>

              {/* -- Mobile: ring left + compact rows right (hidden on xl) -- */}
              <div className="xl:hidden flex items-stretch">
                {/* Left: circular progress ring (matches xl params) */}
                <div
                  className="flex flex-col items-center justify-center gap-2 py-4 shrink-0 w-60"
                  style={{ borderRight: "1px solid var(--card-border)" }}
                >
                  <div className="relative flex items-center justify-center">
                    <svg width="116" height="116" viewBox="0 0 116 116">
                      <circle cx="58" cy="58" r={r + 6} fill="#EFF6FF" />
                      <circle
                        cx="58"
                        cy="58"
                        r={r}
                        fill="white"
                        stroke="#DBEAFE"
                        strokeWidth="8"
                      />
                      <circle
                        cx="58"
                        cy="58"
                        r={r}
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${filled} ${circ - filled}`}
                        strokeDashoffset={circ * 0.25}
                        style={{ transition: "stroke-dasharray 0.6s ease" }}
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span
                        className="text-2xl font-extrabold leading-none"
                        style={{ color: "#2563EB" }}
                      >
                        {stats.total > 0
                          ? Math.round((stats.accepted / stats.total) * 100)
                          : 0}
                        %
                      </span>
                      <span
                        className="text-[11px] font-medium mt-0.5"
                        style={{ color: "var(--muted)" }}
                      >
                        accepted
                      </span>
                    </div>
                  </div>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-widest"
                    style={{ color: "var(--muted)" }}
                  >
                    Accepted / Total
                  </p>
                </div>
                {/* Right: compact rows */}
                <div className="flex flex-col flex-1 divide-y divide-(--card-border)">
                  {statItems.map(({ label, value, sub, accent }) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 px-3 py-2.5 flex-1"
                    >
                      <div
                        className="w-1 self-stretch rounded-full shrink-0 my-0.5"
                        style={{ background: accent }}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[12px] font-bold uppercase tracking-wider leading-none"
                          style={{ color: "#2563EB" }}
                        >
                          {label}
                        </p>
                        {/* <p
                          className="text-[10px] mt-0.5"
                          style={{ color: "var(--muted)" }}
                        >
                          {sub}
                        </p> */}
                      </div>
                      <span
                        className="text-xl font-extrabold shrink-0"
                        style={{ color: accent }}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* -- xl: ring + vertical rows (hidden below xl) -- */}
              <div className="hidden xl:flex flex-col items-center pt-6 pb-5 px-4 gap-1">
                <div className="relative flex items-center justify-center">
                  <svg width="116" height="116" viewBox="0 0 116 116">
                    <circle cx="58" cy="58" r={r + 6} fill="#EFF6FF" />
                    <circle
                      cx="58"
                      cy="58"
                      r={r}
                      fill="white"
                      stroke="#DBEAFE"
                      strokeWidth="8"
                    />
                    <circle
                      cx="58"
                      cy="58"
                      r={r}
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${filled} ${circ - filled}`}
                      strokeDashoffset={circ * 0.25}
                      style={{ transition: "stroke-dasharray 0.6s ease" }}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span
                      className="text-2xl font-extrabold leading-none"
                      style={{ color: "#2563EB" }}
                    >
                      {stats.total > 0
                        ? Math.round((stats.accepted / stats.total) * 100)
                        : 0}
                      %
                    </span>
                    <span
                      className="text-[11px] font-medium mt-0.5"
                      style={{ color: "var(--muted)" }}
                    >
                      accepted
                    </span>
                  </div>
                </div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--muted)" }}
                >
                  Accepted / Total
                </p>
              </div>

              <div className="hidden xl:flex xl:flex-col  xl:flex-1 gap-5 px-3 pb-3">
                {statItems.map(({ label, value, sub }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 px-3 flex-1 rounded-lg"
                    style={{ background: "#3B82F6" }}
                  >
                    <div
                      className="w-1 self-stretch rounded-full shrink-0 my-3"
                      style={{ background: "#FFFFFF" }}
                    />
                    <div className="flex-1 min-w-0 py-3">
                      <p
                        className="text-[18px] font-bold uppercase tracking-wider leading-none"
                        style={{ color: "#FFFFFF" }}
                      >
                        {label}
                      </p>
                      <p
                        className="text-[13px] font-bold mt-0.5"
                        style={{ color: "#000000" }}
                      >
                        {sub}
                      </p>
                    </div>
                    <span
                      className="text-2xl font-extrabold shrink-0"
                      style={{ color: "#FFFFFF" }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* -- Right: Table card ------------------------------- */}
        <div className="card overflow-hidden flex-1 min-w-0 xl:h-full flex flex-col">
          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-(--card-border) space-y-3">
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
              <button
                className={`btn btn-secondary btn-sm gap-1 shrink-0 ${
                  showFilters
                    ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]"
                    : ""
                }`}
                onClick={() => setShowFilters((v) => !v)}
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
              <button className="btn btn-secondary btn-sm gap-1.5 shrink-0">
                <Download size={14} />
                Export
              </button>
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

            {/* Filter row */}
            {showFilters && (
              <div className="flex items-center gap-2 pt-1 pb-0.5 w-full">
                <FilterSelect
                  multiple
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                  }}
                  options={STATUS_OPTIONS}
                  placeholder="Status"
                  className="flex-1 min-w-0"
                />
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
                <FilterSelect
                  multiple
                  value={assigneeFilter}
                  onChange={(v) => {
                    setAssigneeFilter(v);
                    setPage(1);
                  }}
                  options={coordinatorOptions}
                  placeholder="Coordinator"
                  className="flex-1 min-w-0"
                />
                {activeFilterCount > 0 && (
                  <button
                    className="btn btn-ghost btn-sm text-slate-500 hover:text-slate-700 shrink-0"
                    onClick={() => {
                      setStatusFilter([]);
                      setIndustryFilter([]);
                      setPriorityFilter([]);
                      setAssigneeFilter([]);
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
                        "status",
                        "assignedTo",
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
                            : f === "assignedTo"
                              ? "Assigned To"
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
                      <td className="px-4 py-3">
                        <StatusBadge status={company.status} />
                      </td>
                      <td className="px-4 py-3">
                        {company.assignedTo === "Unassigned" ? (
                          <span className="text-slate-400 text-xs italic">
                            Unassigned
                          </span>
                        ) : (
                          <span className="text-slate-700 text-sm">
                            {company.assignedTo}
                          </span>
                        )}
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
              {filtered.length}{" "}
              {filtered.length === 1 ? "company" : "companies"}
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
        {/* end table card */}
      </div>
      {/* end two-column */}

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
