"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Building2,
  CheckCircle2,
  AlertCircle,
  Filter,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserPlus,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import StatusBadge from "@/components/ui/StatusBadge";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import FilterSelect from "@/components/ui/FilterSelect";
import EmptyState from "@/components/ui/EmptyState";
import SearchBar from "@/components/ui/SearchBar";

// --- Mock Data ----------------------------------------------------------------
const COORDINATORS = [
  { id: "c_ananya", name: "Ananya Mehta", avatar: "AM" },
  { id: "c_rohan", name: "Rohan Sharma", avatar: "RS" },
  { id: "c_priya", name: "Priya Singh", avatar: "PS" },
  { id: "c_vibha", name: "Vibha Kapoor", avatar: "VK" },
];

const MOCK_ASSIGNMENTS = [
  {
    companyId: "c1",
    companyName: "Google India",
    industry: "IT",
    status: "accepted",
    coordinatorId: "c_ananya",
    coordinatorName: "Ananya Mehta",
    season: "Placement 2025-26",
    assignedAt: "2025-12-01",
  },
  {
    companyId: "c2",
    companyName: "Microsoft",
    industry: "IT",
    status: "positive",
    coordinatorId: "c_rohan",
    coordinatorName: "Rohan Sharma",
    season: "Placement 2025-26",
    assignedAt: "2025-12-01",
  },
  {
    companyId: "c3",
    companyName: "Goldman Sachs",
    industry: "Finance",
    status: "contacted",
    coordinatorId: "c_priya",
    coordinatorName: "Priya Singh",
    season: "Placement 2025-26",
    assignedAt: "2025-12-02",
  },
  {
    companyId: "c5",
    companyName: "Amazon (AWS)",
    industry: "IT",
    status: "contacted",
    coordinatorId: "c_ananya",
    coordinatorName: "Ananya Mehta",
    season: "Placement 2025-26",
    assignedAt: "2025-12-03",
  },
  {
    companyId: "c6",
    companyName: "McKinsey & Company",
    industry: "Consulting",
    status: "positive",
    coordinatorId: "c_vibha",
    coordinatorName: "Vibha Kapoor",
    season: "Placement 2025-26",
    assignedAt: "2025-12-04",
  },
  {
    companyId: "c8",
    companyName: "Zomato",
    industry: "IT",
    status: "rejected",
    coordinatorId: "c_rohan",
    coordinatorName: "Rohan Sharma",
    season: "Placement 2025-26",
    assignedAt: "2025-12-05",
  },
  {
    companyId: "c9",
    companyName: "PhonePe",
    industry: "Finance",
    status: "contacted",
    coordinatorId: "c_priya",
    coordinatorName: "Priya Singh",
    season: "Placement 2025-26",
    assignedAt: "2025-12-06",
  },
  {
    companyId: "c10",
    companyName: "TCS",
    industry: "IT",
    status: "accepted",
    coordinatorId: "c_ananya",
    coordinatorName: "Ananya Mehta",
    season: "Placement 2025-26",
    assignedAt: "2025-12-07",
  },
  {
    companyId: "c11",
    companyName: "Infosys",
    industry: "IT",
    status: "positive",
    coordinatorId: "c_vibha",
    coordinatorName: "Vibha Kapoor",
    season: "Placement 2025-26",
    assignedAt: "2025-12-08",
  },
  {
    companyId: "c13",
    companyName: "Accenture",
    industry: "Consulting",
    status: "contacted",
    coordinatorId: "c_rohan",
    coordinatorName: "Rohan Sharma",
    season: "Placement 2025-26",
    assignedAt: "2025-12-09",
  },
  {
    companyId: "c14",
    companyName: "Flipkart",
    industry: "IT",
    status: "not_contacted",
    coordinatorId: "c_vibha",
    coordinatorName: "Vibha Kapoor",
    season: "Placement 2025-26",
    assignedAt: "2025-12-10",
  },
];

const UNASSIGNED_COMPANIES = [
  { companyId: "c4", companyName: "Deloitte", industry: "Consulting" },
  { companyId: "c7", companyName: "HUL", industry: "FMCG" },
  {
    companyId: "c12",
    companyName: "L&T Technology",
    industry: "Core Engineering",
  },
  { companyId: "c15", companyName: "Mu Sigma", industry: "Analytics" },
];

const STATUS_OPTIONS = [
  { value: "not_contacted", label: "Not Contacted" },
  { value: "contacted", label: "Contacted" },
  { value: "positive", label: "Positive" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];
const COORDINATOR_OPTIONS = COORDINATORS.map((c) => ({
  value: c.id,
  label: c.name,
}));

const PIE_COLORS = ["#2563EB", "#E2E8F0"];
const BAR_COLORS = ["#2563EB", "#3B82F6", "#BFDBFE", "#DBEAFE"];

function AssignModal({
  isOpen,
  onClose,
  companies,
  isBulk,
}: {
  isOpen: boolean;
  onClose: () => void;
  companies: typeof UNASSIGNED_COMPANIES;
  isBulk: boolean;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isBulk
          ? "Bulk Assign Companies"
          : `Assign — ${companies[0]?.companyName}`
      }
      size="md"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            <UserCheck size={14} />
            Assign
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {isBulk && (
          <div className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-lg px-3 py-2.5 text-sm text-slate-600">
            Assigning <strong>{companies.length} companies</strong> to a
            coordinator.
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Assign To *
          </label>
          <select className="input-base">
            <option value="">-- Select Coordinator --</option>
            {COORDINATORS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Season *
          </label>
          <select className="input-base">
            <option>Placement 2025-26</option>
            <option>Intern 2025</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notes
          </label>
          <textarea
            rows={2}
            className="input-base"
            placeholder="Optional instructions for the coordinator..."
          />
        </div>
      </div>
    </Modal>
  );
}

function ReassignModal({
  isOpen,
  onClose,
  companyName,
}: {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Reassign — ${companyName}`}
      size="sm"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            <RefreshCw size={14} />
            Reassign
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            New Coordinator *
          </label>
          <select className="input-base">
            <option value="">-- Select --</option>
            {COORDINATORS.map((c) => (
              <option key={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Reason *
          </label>
          <textarea
            rows={2}
            className="input-base"
            placeholder="Why is this being reassigned?"
          />
        </div>
      </div>
    </Modal>
  );
}

export default function AssignmentsPage() {
  const [tab, setTab] = useState<"assigned" | "unassigned">("assigned");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [coordinatorFilter, setCoordinatorFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [assignModal, setAssignModal] = useState<{
    companies: typeof UNASSIGNED_COMPANIES;
    bulk: boolean;
  } | null>(null);
  const [reassignModal, setReassignModal] = useState<string | null>(null);
  const [selectedUnassigned, setSelectedUnassigned] = useState<Set<string>>(
    new Set(),
  );
  const [showCharts, setShowCharts] = useState(true);

  // Stats
  const stats = useMemo(() => {
    const byCoord = COORDINATORS.map((c) => ({
      name: c.name.split(" ")[0],
      companies: MOCK_ASSIGNMENTS.filter((a) => a.coordinatorId === c.id)
        .length,
    }));
    return {
      total: MOCK_ASSIGNMENTS.length + UNASSIGNED_COMPANIES.length,
      assigned: MOCK_ASSIGNMENTS.length,
      unassigned: UNASSIGNED_COMPANIES.length,
      byCoord,
    };
  }, []);

  const pieData = [
    { name: "Assigned", value: stats.assigned },
    { name: "Unassigned", value: stats.unassigned },
  ];

  const filteredAssigned = useMemo(() => {
    let data = MOCK_ASSIGNMENTS;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (a) =>
          a.companyName.toLowerCase().includes(q) ||
          a.coordinatorName.toLowerCase().includes(q),
      );
    }
    if (statusFilter.length > 0)
      data = data.filter((a) => statusFilter.includes(a.status));
    if (coordinatorFilter.length > 0)
      data = data.filter((a) => coordinatorFilter.includes(a.coordinatorId));
    return data;
  }, [search, statusFilter, coordinatorFilter]);

  const filteredUnassigned = useMemo(() => {
    let data = UNASSIGNED_COMPANIES;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((c) => c.companyName.toLowerCase().includes(q));
    }
    return data;
  }, [search]);
  const activeFilterCount = statusFilter.length + coordinatorFilter.length;

  // Group assigned by coordinator
  const groupedByCoordinator = useMemo(() => {
    const groups: Record<string, typeof MOCK_ASSIGNMENTS> = {};
    for (const a of filteredAssigned) {
      if (!groups[a.coordinatorName]) groups[a.coordinatorName] = [];
      groups[a.coordinatorName].push(a);
    }
    return groups;
  }, [filteredAssigned]);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(Object.keys(groupedByCoordinator)),
  );

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const toggleSelectUnassigned = (id: string) => {
    setSelectedUnassigned((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const TABS = [
    { key: "assigned" as const, label: "Assigned", count: stats.assigned },
    {
      key: "unassigned" as const,
      label: "Unassigned",
      count: stats.unassigned,
    },
  ];

  return (
    <div className="-mt-6 xl:mt-0 space-y-5 pl-4 pr-4 pb-6 animate-fade-in xl:h-full xl:overflow-y-auto hide-scrollbar">
      {/* -- Hero header card (matching outreach / mailing style) ------ */}
      <div className="relative z-0 pt-10">
        <div
          className="card relative overflow-hidden px-5 py-4 sm:px-6 sm:py-5"
          style={{
            background: "#FFFFFF",
            borderColor: "#DBEAFE",
          }}
        >
          <div className="relative z-10">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#2563EB]">
              Coordinator Assignments
            </p>
            <h1 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Manage company assignments to coordinators
            </h1>
            <p className="mt-1.5 text-sm font-bold text-[#2563EB]">
              Assign, reassign, and track company-coordinator mappings for the
              current placement season.
            </p>

            <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  title: "Total Companies",
                  value: stats.total,
                  icon: Building2,
                },
                {
                  title: "Assigned",
                  value: stats.assigned,
                  icon: UserCheck,
                },
                {
                  title: "Unassigned",
                  value: stats.unassigned,
                  icon: AlertCircle,
                },
                {
                  title: "Coordinators",
                  value: COORDINATORS.length,
                  icon: Users,
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-[#1D4ED8] bg-[#2563EB] px-3 py-2.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold text-white uppercase tracking-wide">
                        {item.title}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-black leading-none">
                        {item.value}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#DBEAFE] flex items-center justify-center shrink-0">
                      <item.icon size={20} color="#2563EB" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* -- Toolbar card ---------------------------------------------- */}
      <div className="card overflow-visible flex flex-col">
        <div className="px-4 py-3 border-b border-(--card-border) space-y-3">
          <div className="flex items-center gap-2">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={
                tab === "assigned"
                  ? "Search company or coordinator..."
                  : "Search company..."
              }
              className="flex-1 min-w-0"
            />
            {tab === "assigned" && (
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
            )}
            {tab === "unassigned" && selectedUnassigned.size > 0 && (
              <button
                className="btn btn-primary btn-sm gap-1 shrink-0"
                onClick={() =>
                  setAssignModal({
                    companies: UNASSIGNED_COMPANIES.filter((c) =>
                      selectedUnassigned.has(c.companyId),
                    ),
                    bulk: selectedUnassigned.size > 1,
                  })
                }
              >
                <UserPlus size={14} />
                Bulk Assign ({selectedUnassigned.size})
              </button>
            )}
          </div>

          {showFilters && tab === "assigned" && (
            <div className="flex items-center gap-2 pt-1 pb-0.5 w-full">
              <FilterSelect
                multiple
                value={statusFilter}
                onChange={setStatusFilter}
                options={STATUS_OPTIONS}
                placeholder="Status"
                className="z-20 flex-1 min-w-0"
              />
              <FilterSelect
                multiple
                value={coordinatorFilter}
                onChange={setCoordinatorFilter}
                options={COORDINATOR_OPTIONS}
                placeholder="Coordinator"
                className="z-20 flex-1 min-w-0"
              />
              {(statusFilter.length > 0 || coordinatorFilter.length > 0) && (
                <button
                  className="btn btn-ghost btn-sm text-slate-500 hover:text-slate-700 shrink-0"
                  onClick={() => {
                    setStatusFilter([]);
                    setCoordinatorFilter([]);
                  }}
                >
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* -- Two-column layout: List (left) + Stats/Charts (right) --- */}
      <div className="flex flex-col xl:flex-row gap-5">
        {/* -- LEFT COLUMN: Assignment List ---------------------------- */}
        <div className="flex-1 min-w-0">
          <div className="card overflow-hidden">
            {/* Tab header */}
            <div className="border-b border-[#DBEAFE] flex items-center justify-between px-4">
              <div className="flex">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all
                      ${
                        tab === t.key
                          ? "border-[#2563EB] text-[#2563EB]"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    {t.label}
                    <span
                      className={`text-xs rounded-full px-1.5 py-0.5 font-semibold
                      ${tab === t.key ? "bg-[#DBEAFE] text-[#1D4ED8]" : "bg-slate-100 text-slate-500"}`}
                    >
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Assigned tab content */}
            {tab === "assigned" && (
              <div className="p-4 space-y-3">
                {Object.keys(groupedByCoordinator).length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No assignments found"
                    description="Try adjusting the filters."
                  />
                ) : (
                  Object.entries(groupedByCoordinator).map(
                    ([coordinatorName, entries]) => (
                      <div
                        key={coordinatorName}
                        className="border border-[#DBEAFE] rounded-xl overflow-hidden"
                      >
                        {/* Group header */}
                        <button
                          className="w-full flex items-center justify-between px-4 py-3 bg-[#F5F9FF] hover:bg-[#EFF6FF] transition-colors"
                          onClick={() => toggleGroup(coordinatorName)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[#1D4ED8] text-xs font-semibold">
                              {coordinatorName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-semibold text-slate-800">
                                {coordinatorName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {entries.length} companies assigned
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="danger" size="sm">
                              {entries.length}
                            </Badge>
                            {expandedGroups.has(coordinatorName) ? (
                              <ChevronUp size={16} className="text-slate-400" />
                            ) : (
                              <ChevronDown
                                size={16}
                                className="text-slate-400"
                              />
                            )}
                          </div>
                        </button>

                        {/* Group rows */}
                        {expandedGroups.has(coordinatorName) && (
                          <div className="divide-y divide-[#EFF6FF]">
                            {entries.map((a) => (
                              <div
                                key={a.companyId}
                                className="flex items-center gap-4 px-4 py-3 hover:bg-[#F5F9FF] transition-colors"
                              >
                                <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center text-[#1D4ED8] text-xs font-semibold shrink-0">
                                  {a.companyName.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <Link
                                    href={`/companies/${a.companyId}`}
                                    className="text-sm font-medium text-slate-900 hover:text-[#2563EB] transition-colors truncate block"
                                  >
                                    {a.companyName}
                                  </Link>
                                  <p className="text-xs text-slate-400">
                                    {a.industry} · {a.season}
                                  </p>
                                </div>
                                <StatusBadge status={a.status} size="sm" />
                                <button
                                  className="btn btn-ghost btn-sm gap-1 text-slate-500 hover:text-[#2563EB] hidden sm:flex"
                                  onClick={() =>
                                    setReassignModal(a.companyName)
                                  }
                                >
                                  <RefreshCw size={13} />
                                  Reassign
                                </button>
                                <button
                                  className="sm:hidden btn btn-ghost btn-sm btn-icon text-slate-400 hover:text-[#2563EB]"
                                  onClick={() =>
                                    setReassignModal(a.companyName)
                                  }
                                >
                                  <RefreshCw size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ),
                  )
                )}
              </div>
            )}

            {/* Unassigned tab content */}
            {tab === "unassigned" && (
              <div className="p-4 space-y-2">
                {filteredUnassigned.length === 0 ? (
                  <EmptyState
                    icon={CheckCircle2}
                    title="All companies are assigned!"
                    description="Every company in this season has been assigned to a coordinator."
                  />
                ) : (
                  filteredUnassigned.map((c) => (
                    <div
                      key={c.companyId}
                      className="flex items-center gap-4 p-3 border border-[#DBEAFE] rounded-xl hover:bg-[#F5F9FF] transition-colors group"
                    >
                      <button
                        onClick={() => toggleSelectUnassigned(c.companyId)}
                        className="text-slate-300 group-hover:text-slate-400 hover:text-[#2563EB]! transition-colors shrink-0"
                      >
                        {selectedUnassigned.has(c.companyId) ? (
                          <CheckCircle2 size={16} className="text-[#2563EB]" />
                        ) : (
                          <div className="w-4 h-4 rounded border border-slate-300 group-hover:border-[#3B82F6]" />
                        )}
                      </button>
                      <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center text-[#1D4ED8] text-xs font-semibold shrink-0">
                        {c.companyName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/companies/${c.companyId}`}
                          className="text-sm font-medium text-slate-900 hover:text-[#2563EB] transition-colors truncate block"
                        >
                          {c.companyName}
                        </Link>
                        <p className="text-xs text-slate-400">{c.industry}</p>
                      </div>
                      <Badge variant="warning" size="sm" dot>
                        Unassigned
                      </Badge>
                      <button
                        className="btn btn-primary btn-sm gap-1 shrink-0"
                        onClick={() =>
                          setAssignModal({ companies: [c], bulk: false })
                        }
                      >
                        <UserPlus size={13} />
                        <span className="hidden sm:inline">Assign</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* -- RIGHT COLUMN: Charts & Stats --------------------------- */}
        <div className="xl:w-[380px] shrink-0 space-y-5">
          {/* Quick stats cards */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="card p-4 hover:shadow-md transition-all hover:-translate-y-0.5"
              style={{ borderLeft: "3px solid #2563EB" }}
            >
              <p className="text-xs text-slate-500 font-medium">Coverage</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">
                {Math.round((stats.assigned / stats.total) * 100)}%
              </p>
              <p className="text-[11px] text-emerald-600 mt-1">
                {stats.assigned}/{stats.total} companies
              </p>
            </div>
            <div
              className="card p-4 hover:shadow-md transition-all hover:-translate-y-0.5"
              style={{ borderLeft: "3px solid #3B82F6" }}
            >
              <p className="text-xs text-slate-500 font-medium">Avg Load</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">
                {(stats.assigned / COORDINATORS.length).toFixed(1)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">per coordinator</p>
            </div>
          </div>

          {/* Pie chart card */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#DBEAFE]">
              <div className="flex items-center gap-2">
                <PieChartIcon size={14} className="text-[#2563EB]" />
                <h3 className="text-sm font-semibold text-slate-800">
                  Assignment Ratio
                </h3>
              </div>
              <button
                onClick={() => setShowCharts((v) => !v)}
                className="btn btn-ghost btn-sm gap-1 text-slate-500"
              >
                {showCharts ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>
            </div>

            {showCharts && (
              <div className="p-4">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={72}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #DBEAFE",
                          fontSize: "12px",
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "12px" }}
                        iconType="circle"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Bar chart card */}
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#DBEAFE]">
              <BarChart3 size={14} className="text-[#2563EB]" />
              <h3 className="text-sm font-semibold text-slate-800">
                Coordinator Load
              </h3>
            </div>

            {showCharts && (
              <div className="p-4">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.byCoord}
                      margin={{ top: 0, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#EFF6FF" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: "#64748B" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#94A3B8" }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #DBEAFE",
                          fontSize: "12px",
                        }}
                        cursor={{ fill: "#F5F9FF" }}
                      />
                      <Bar
                        dataKey="companies"
                        name="Companies"
                        radius={[6, 6, 0, 0]}
                      >
                        {stats.byCoord.map((_, idx) => (
                          <Cell
                            key={idx}
                            fill={BAR_COLORS[idx % BAR_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Coordinator breakdown */}
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#DBEAFE]">
              <Users size={14} className="text-[#2563EB]" />
              <h3 className="text-sm font-semibold text-slate-800">
                Coordinator Summary
              </h3>
            </div>
            <div className="divide-y divide-[#EFF6FF]">
              {COORDINATORS.map((c) => {
                const count = MOCK_ASSIGNMENTS.filter(
                  (a) => a.coordinatorId === c.id,
                ).length;
                const percent =
                  stats.assigned > 0
                    ? Math.round((count / stats.assigned) * 100)
                    : 0;
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[#F5F9FF] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[#1D4ED8] text-xs font-semibold shrink-0">
                      {c.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {c.name}
                      </p>
                      <div className="mt-1 h-1.5 bg-[#EFF6FF] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2563EB] rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-700 tabular-nums">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {assignModal && (
        <AssignModal
          isOpen={!!assignModal}
          onClose={() => {
            setAssignModal(null);
            setSelectedUnassigned(new Set());
          }}
          companies={assignModal.companies}
          isBulk={assignModal.bulk}
        />
      )}
      {reassignModal && (
        <ReassignModal
          isOpen={!!reassignModal}
          onClose={() => setReassignModal(null)}
          companyName={reassignModal}
        />
      )}
    </div>
  );
}
