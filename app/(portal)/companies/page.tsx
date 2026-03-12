"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Download,
  Building2,
  Info,
  Search,
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
import ContactModal from "@/components/companies/ContactModal";

// --- Types -------------------------------------------------------------------
type CycleStatus =
  | "not_contacted"
  | "contacted"
  | "positive"
  | "accepted"
  | "rejected";
type Industry =
  | "IT"
  | "Finance"
  | "Analytics"
  | "Consulting"
  | "FMCG"
  | "Core Engineering"
  | "Healthcare"
  | "Media";

interface Company {
  id: string;
  name: string;
  slug: string;
  industry: Industry;
  website?: string;
  priority: "high" | "medium" | "low";
  status: CycleStatus;
  assignedTo: string;
  lastUpdated: string;
  lastUpdatedBy: string;
  updatedField: string;
  contacts: number;
  isWishlisted?: boolean;
}

// --- Mock Data ----------------------------------------------------------------
const MOCK_COMPANIES: Company[] = [
  {
    id: "c1",
    name: "Google India",
    slug: "google-india",
    industry: "IT",
    website: "google.com",
    priority: "high",
    status: "accepted",
    assignedTo: "Ananya Mehta",
    lastUpdated: "2026-02-18",
    lastUpdatedBy: "Ananya Mehta",
    updatedField: "status",
    contacts: 3,
  },
  {
    id: "c2",
    name: "Microsoft",
    slug: "microsoft",
    industry: "IT",
    website: "microsoft.com",
    priority: "high",
    status: "positive",
    assignedTo: "Rohan Sharma",
    lastUpdated: "2026-02-17",
    lastUpdatedBy: "Rohan Sharma",
    updatedField: "priority",
    contacts: 2,
  },
  {
    id: "c3",
    name: "Goldman Sachs",
    slug: "goldman-sachs",
    industry: "Finance",
    website: "goldmansachs.com",
    priority: "high",
    status: "contacted",
    assignedTo: "Priya Singh",
    lastUpdated: "2026-02-16",
    lastUpdatedBy: "Priya Singh",
    updatedField: "notes",
    contacts: 2,
  },
  {
    id: "c4",
    name: "Deloitte",
    slug: "deloitte",
    industry: "Consulting",
    website: "deloitte.com",
    priority: "medium",
    status: "not_contacted",
    assignedTo: "Unassigned",
    lastUpdated: "2026-02-15",
    lastUpdatedBy: "Vibha Kapoor",
    updatedField: "website",
    contacts: 1,
  },
  {
    id: "c5",
    name: "Amazon (AWS)",
    slug: "amazon-aws",
    industry: "IT",
    website: "aws.amazon.com",
    priority: "high",
    status: "contacted",
    assignedTo: "Ananya Mehta",
    lastUpdated: "2026-02-14",
    lastUpdatedBy: "Ananya Mehta",
    updatedField: "status",
    contacts: 4,
  },
  {
    id: "c6",
    name: "McKinsey & Company",
    slug: "mckinsey",
    industry: "Consulting",
    website: "mckinsey.com",
    priority: "high",
    status: "positive",
    assignedTo: "Vibha Kapoor",
    lastUpdated: "2026-02-13",
    lastUpdatedBy: "Vibha Kapoor",
    updatedField: "status",
    contacts: 2,
  },
  {
    id: "c7",
    name: "HUL",
    slug: "hul",
    industry: "FMCG",
    website: "hul.co.in",
    priority: "medium",
    status: "not_contacted",
    assignedTo: "Unassigned",
    lastUpdated: "2026-02-12",
    lastUpdatedBy: "Rohan Sharma",
    updatedField: "industry",
    contacts: 1,
  },
  {
    id: "c8",
    name: "Zomato",
    slug: "zomato",
    industry: "IT",
    website: "zomato.com",
    priority: "medium",
    status: "rejected",
    assignedTo: "Rohan Sharma",
    lastUpdated: "2026-02-11",
    lastUpdatedBy: "Rohan Sharma",
    updatedField: "status",
    contacts: 2,
  },
  {
    id: "c9",
    name: "PhonePe",
    slug: "phonepe",
    industry: "Finance",
    website: "phonepe.com",
    priority: "medium",
    status: "contacted",
    assignedTo: "Priya Singh",
    lastUpdated: "2026-02-10",
    lastUpdatedBy: "Priya Singh",
    updatedField: "3 fields",
    contacts: 3,
  },
  {
    id: "c10",
    name: "Tata Consultancy",
    slug: "tcs",
    industry: "IT",
    website: "tcs.com",
    priority: "medium",
    status: "accepted",
    assignedTo: "Ananya Mehta",
    lastUpdated: "2026-02-09",
    lastUpdatedBy: "Ananya Mehta",
    updatedField: "status",
    contacts: 5,
  },
  {
    id: "c11",
    name: "Infosys",
    slug: "infosys",
    industry: "IT",
    website: "infosys.com",
    priority: "medium",
    status: "positive",
    assignedTo: "Vibha Kapoor",
    lastUpdated: "2026-02-08",
    lastUpdatedBy: "Vibha Kapoor",
    updatedField: "priority",
    contacts: 3,
  },
  {
    id: "c12",
    name: "L&T Technology",
    slug: "lnt-tech",
    industry: "Core Engineering",
    website: "ltts.com",
    priority: "low",
    status: "not_contacted",
    assignedTo: "Unassigned",
    lastUpdated: "2026-02-07",
    lastUpdatedBy: "Priya Singh",
    updatedField: "name",
    contacts: 1,
  },
  {
    id: "c13",
    name: "Accenture",
    slug: "accenture",
    industry: "Consulting",
    website: "accenture.com",
    priority: "medium",
    status: "contacted",
    assignedTo: "Rohan Sharma",
    lastUpdated: "2026-02-06",
    lastUpdatedBy: "Rohan Sharma",
    updatedField: "status",
    contacts: 2,
  },
  {
    id: "c14",
    name: "Flipkart",
    slug: "flipkart",
    industry: "IT",
    website: "flipkart.com",
    priority: "high",
    status: "positive",
    assignedTo: "Vibha Kapoor",
    lastUpdated: "2026-02-05",
    lastUpdatedBy: "Vibha Kapoor",
    updatedField: "2 fields",
    contacts: 3,
  },
  {
    id: "c15",
    name: "Mu Sigma",
    slug: "mu-sigma",
    industry: "Analytics",
    website: "mu-sigma.com",
    priority: "medium",
    status: "not_contacted",
    assignedTo: "Unassigned",
    lastUpdated: "2026-02-04",
    lastUpdatedBy: "Ananya Mehta",
    updatedField: "notes",
    contacts: 1,
  },
];

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
const COORDINATOR_OPTIONS = [
  { value: "Ananya Mehta", label: "Ananya Mehta" },
  { value: "Rohan Sharma", label: "Rohan Sharma" },
  { value: "Priya Singh", label: "Priya Singh" },
  { value: "Vibha Kapoor", label: "Vibha Kapoor" },
  { value: "Unassigned", label: "Unassigned" },
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

function AddEditModal({
  isOpen,
  onClose,
  company,
}: {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={company ? "Edit Company" : "Add Company"}
      size="lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            {company ? "Save Changes" : "Add Company"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Company Name *
          </label>
          <input
            defaultValue={company?.name}
            className="input-base"
            placeholder="e.g. Google India"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Industry
          </label>
          <select defaultValue={company?.industry} className="input-base">
            {INDUSTRY_OPTIONS.map((o) => (
              <option key={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Priority
          </label>
          <select defaultValue={company?.priority} className="input-base">
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
            defaultValue={company?.website}
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
            placeholder="Add notes about this company..."
          />
        </div>
      </div>
    </Modal>
  );
}

function DeleteModal({
  isOpen,
  onClose,
  company,
}: {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Company"
      size="sm"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onClose}>
            Delete Company
          </button>
        </>
      }
    >
      <div className="space-y-3">
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
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactTargetCompany, setContactTargetCompany] =
    useState<Company | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [updateDetails, setUpdateDetails] = useState<{
    company: Company;
    position: { left: number; top: number };
  } | null>(null);

  const PER_PAGE = 10;

  const filtered = useMemo(() => {
    let data = MOCK_COMPANIES;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q),
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
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const stats = useMemo(
    () => ({
      total: MOCK_COMPANIES.length,
      accepted: MOCK_COMPANIES.filter((c) => c.status === "accepted").length,
      positive: MOCK_COMPANIES.filter(
        (c) => c.status === "positive" || c.status === "accepted",
      ).length,
      notContacted: MOCK_COMPANIES.filter((c) => c.status === "not_contacted")
        .length,
    }),
    [],
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
                    style={{ background: "#2563EB" }}
                  >
                    <div
                      className="w-1 self-stretch rounded-full shrink-0 my-3"
                      style={{ background: "#FFFFFF" }}
                    />
                    <div className="flex-1 min-w-0 py-3">
                      <p
                        className="text-[18px] font-bold uppercase tracking-wider leading-none"
                        style={{ color: "#000000" }}
                      >
                        {label}
                      </p>
                      <p
                        className="text-[12px] font-medium mt-0.5"
                        style={{ color: "#FFFFFF" }}
                      >
                        {sub}
                      </p>
                    </div>
                    <span
                      className="text-2xl font-extrabold shrink-0"
                      style={{ color: "#000000" }}
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
                  options={COORDINATOR_OPTIONS}
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
            {paginated.length === 0 ? (
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
                          {new Date(company.lastUpdated).toLocaleDateString(
                            "en-IN",
                            { day: "numeric", month: "short", year: "numeric" },
                          )}
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
        onClose={() => setAddEditOpen(false)}
        company={selectedCompany}
      />
      <DeleteModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        company={selectedCompany}
      />
      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => {
          setContactModalOpen(false);
          setContactTargetCompany(null);
        }}
        contact={null}
        title={
          contactTargetCompany
            ? `Add Contact - ${contactTargetCompany.name}`
            : "Add Contact"
        }
      />
    </div>
  );
}
