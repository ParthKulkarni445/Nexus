"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Download,
  Building2,
  Search,
  Filter,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  Eye,

  Users,
  CheckCircle2,
  Phone,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import StatCard from "@/components/ui/StatCard";
import SearchBar from "@/components/ui/SearchBar";
import FilterSelect from "@/components/ui/FilterSelect";
import EmptyState from "@/components/ui/EmptyState";

// ─── Types ───────────────────────────────────────────────────────────────────
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
  contacts: number;
  isWishlisted?: boolean;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
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
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-700">
          All associated contacts, assignments, and history will be permanently
          removed.
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CompaniesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [sortField, setSortField] = useState<keyof Company>("lastUpdated");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [addEditOpen, setAddEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showFilters, setShowFilters] = useState(false);

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
    if (statusFilter) data = data.filter((c) => c.status === statusFilter);
    if (industryFilter)
      data = data.filter((c) => c.industry === industryFilter);
    if (priorityFilter)
      data = data.filter((c) => c.priority === priorityFilter);
    if (assigneeFilter)
      data = data.filter((c) => c.assignedTo === assigneeFilter);

    data = [...data].sort((a, b) => {
      const aVal = String(a[sortField]);
      const bVal = String(b[sortField]);
      const cmp = aVal.localeCompare(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });
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
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: keyof Company }) => {
    if (sortField !== field)
      return <ChevronUp size={12} className="text-slate-300" />;
    return sortDir === "asc" ? (
      <ChevronUp size={12} className="text-indigo-500" />
    ) : (
      <ChevronDown size={12} className="text-indigo-500" />
    );
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Companies"
          value={stats.total}
          icon={Building2}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          subtitle="In master database"
        />
        <StatCard
          title="Accepted / JD"
          value={stats.accepted}
          icon={CheckCircle2}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          change={`+2 this week`}
          changeType="up"
        />
        <StatCard
          title="Positive Response"
          value={stats.positive}
          icon={Users}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          subtitle="Including accepted"
        />
        <StatCard
          title="Not Contacted"
          value={stats.notContacted}
          icon={Phone}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          subtitle="Needs outreach"
        />
      </div>

      {/* Table card */}
      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <SearchBar
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search companies..."
              className="flex-1 min-w-0"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button
                className={`btn btn-secondary btn-sm gap-1 ${showFilters ? "bg-indigo-50 border-indigo-200 text-indigo-700" : ""}`}
                onClick={() => setShowFilters((v) => !v)}
              >
                <Filter size={14} />
                Filters
                {(statusFilter ||
                  industryFilter ||
                  priorityFilter ||
                  assigneeFilter) && (
                  <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center">
                    {
                      [
                        statusFilter,
                        industryFilter,
                        priorityFilter,
                        assigneeFilter,
                      ].filter(Boolean).length
                    }
                  </span>
                )}
              </button>
              <button className="btn btn-secondary btn-sm gap-1">
                <Download size={14} />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                className="btn btn-primary btn-sm gap-1"
                onClick={() => {
                  setSelectedCompany(null);
                  setAddEditOpen(true);
                }}
              >
                <Plus size={14} />
                <span className="hidden sm:inline">Add Company</span>
              </button>
            </div>
          </div>

          {/* Filter row */}
          {showFilters && (
            <div className="flex flex-wrap gap-2 pt-1 pb-0.5">
              <FilterSelect
                value={statusFilter}
                onChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
                options={STATUS_OPTIONS}
                placeholder="All Statuses"
                className="w-40"
              />
              <FilterSelect
                value={industryFilter}
                onChange={(v) => {
                  setIndustryFilter(v);
                  setPage(1);
                }}
                options={INDUSTRY_OPTIONS}
                placeholder="All Industries"
                className="w-40"
              />
              <FilterSelect
                value={priorityFilter}
                onChange={(v) => {
                  setPriorityFilter(v);
                  setPage(1);
                }}
                options={PRIORITY_OPTIONS}
                placeholder="All Priorities"
                className="w-44"
              />
              <FilterSelect
                value={assigneeFilter}
                onChange={(v) => {
                  setAssigneeFilter(v);
                  setPage(1);
                }}
                options={COORDINATOR_OPTIONS}
                placeholder="All Coordinators"
                className="w-44"
              />
              {(statusFilter ||
                industryFilter ||
                priorityFilter ||
                assigneeFilter) && (
                <button
                  className="btn btn-ghost btn-sm text-red-500 hover:text-red-700"
                  onClick={() => {
                    setStatusFilter("");
                    setIndustryFilter("");
                    setPriorityFilter("");
                    setAssigneeFilter("");
                    setPage(1);
                  }}
                >
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>

        {/* Result count */}
        <div className="px-4 py-2 text-xs text-slate-500 border-b border-slate-50 bg-slate-50/50">
          Showing {filtered.length}{" "}
          {filtered.length === 1 ? "company" : "companies"}
          {search && (
            <>
              {" "}
              for &ldquo;<strong>{search}</strong>&rdquo;
            </>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {paginated.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No companies found"
              description="Try adjusting your search or filters"
            />
          ) : (
            <table className="w-full text-sm min-w-160">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
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
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap group cursor-pointer select-none"
                      onClick={() => handleSort(f)}
                    >
                      <span className="flex items-center gap-1">
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
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
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-xs shrink-0">
                          {company.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
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
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-[10px] font-semibold shrink-0">
                            {company.assignedTo
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>
                          <span className="text-slate-700 text-sm">
                            {company.assignedTo}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(company.lastUpdated).toLocaleDateString(
                        "en-IN",
                        { day: "numeric", month: "short", year: "numeric" },
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 relative">
                        <Link
                          href={`/companies/${company.id}`}
                          className="btn btn-ghost btn-sm btn-icon text-slate-500 hover:text-indigo-600"
                          title="View"
                        >
                          <Eye size={15} />
                        </Link>
                        <button
                          className="btn btn-ghost btn-sm btn-icon text-slate-500 hover:text-indigo-600"
                          title="Edit"
                          onClick={() => {
                            setSelectedCompany(company);
                            setAddEditOpen(true);
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm btn-icon text-slate-500 hover:text-red-500"
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
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              Page {page} of {totalPages} &mdash; {filtered.length} results
            </p>
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
          </div>
        )}
      </div>

      {/* Modals */}
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
    </div>
  );
}
