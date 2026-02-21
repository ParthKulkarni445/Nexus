"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Building2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Filter,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserPlus,
  RefreshCw,
  Briefcase,
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
import StatCard from "@/components/ui/StatCard";
import SearchBar from "@/components/ui/SearchBar";

// ─── Mock Data ────────────────────────────────────────────────────────────────
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

const PIE_COLORS = ["#6366F1", "#E2E8F0"];
const BAR_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#3B82F6"];

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
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-600">
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
  const [statusFilter, setStatusFilter] = useState("");
  const [coordinatorFilter, setCoordinatorFilter] = useState("");
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
    if (statusFilter) data = data.filter((a) => a.status === statusFilter);
    if (coordinatorFilter)
      data = data.filter((a) => a.coordinatorId === coordinatorFilter);
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
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Companies"
          value={stats.total}
          icon={Building2}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          subtitle="This season"
        />
        <StatCard
          title="Assigned"
          value={stats.assigned}
          icon={UserCheck}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          change={`${Math.round((stats.assigned / stats.total) * 100)}% coverage`}
          changeType="up"
        />
        <StatCard
          title="Unassigned"
          value={stats.unassigned}
          icon={AlertCircle}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          subtitle="Needs assignment"
        />
        <StatCard
          title="Coordinators"
          value={COORDINATORS.length}
          icon={Users}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          subtitle="Active this season"
        />
      </div>

      {/* Charts */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-800">
              Distribution Overview
            </h3>
          </div>
          <button
            onClick={() => setShowCharts((v) => !v)}
            className="btn btn-ghost btn-sm gap-1 text-slate-500"
          >
            {showCharts ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showCharts ? "Hide" : "Show"}
          </button>
        </div>

        {showCharts && (
          <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie chart */}
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <PieChartIcon size={13} className="text-indigo-500" />
                Assigned vs Unassigned
              </p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
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
                        border: "1px solid #E2E8F0",
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

            {/* Bar chart */}
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <BarChart3 size={13} className="text-indigo-500" />
                Coordinator Load
              </p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.byCoord}
                    margin={{ top: 0, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
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
                        border: "1px solid #E2E8F0",
                        fontSize: "12px",
                      }}
                      cursor={{ fill: "#F1F5F9" }}
                    />
                    <Bar
                      dataKey="companies"
                      name="Companies"
                      radius={[4, 4, 0, 0]}
                      fill="#6366F1"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main table/list card */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 flex items-center justify-between px-4">
          <div className="flex">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all
                  ${
                    tab === t.key
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
              >
                {t.label}
                <span
                  className={`text-xs rounded-full px-1.5 py-0.5 font-semibold
                  ${tab === t.key ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>
          <div className="shrink-0">
            {tab === "unassigned" && selectedUnassigned.size > 0 && (
              <button
                className="btn btn-primary btn-sm gap-1"
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
        </div>

        {/* Search & filters */}
        <div className="px-4 py-3 border-b border-slate-50 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <SearchBar
              value={search}
              onChange={(v) => setSearch(v)}
              placeholder={
                tab === "assigned"
                  ? "Search company or coordinator..."
                  : "Search company..."
              }
              className="flex-1"
            />
            {tab === "assigned" && (
              <button
                className={`btn btn-secondary btn-sm shrink-0 ${showFilters ? "bg-indigo-50 border-indigo-200 text-indigo-700" : ""}`}
                onClick={() => setShowFilters((v) => !v)}
              >
                <Filter size={14} />
                Filters
              </button>
            )}
          </div>
          {showFilters && tab === "assigned" && (
            <div className="flex flex-wrap gap-2">
              <FilterSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={STATUS_OPTIONS}
                placeholder="All Statuses"
                className="w-40"
              />
              <FilterSelect
                value={coordinatorFilter}
                onChange={setCoordinatorFilter}
                options={COORDINATOR_OPTIONS}
                placeholder="All Coordinators"
                className="w-44"
              />
              {(statusFilter || coordinatorFilter) && (
                <button
                  className="btn btn-ghost btn-sm text-red-500"
                  onClick={() => {
                    setStatusFilter("");
                    setCoordinatorFilter("");
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          )}
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
                    className="border border-slate-200 rounded-xl overflow-hidden"
                  >
                    {/* Group header */}
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                      onClick={() => toggleGroup(coordinatorName)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-semibold">
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
                        <Badge variant="purple" size="sm">
                          {entries.length}
                        </Badge>
                        {expandedGroups.has(coordinatorName) ? (
                          <ChevronUp size={16} className="text-slate-400" />
                        ) : (
                          <ChevronDown size={16} className="text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Group rows */}
                    {expandedGroups.has(coordinatorName) && (
                      <div className="divide-y divide-slate-50">
                        {entries.map((a) => (
                          <div
                            key={a.companyId}
                            className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-semibold shrink-0">
                              {a.companyName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <Link
                                href={`/companies/${a.companyId}`}
                                className="text-sm font-medium text-slate-900 hover:text-indigo-600 transition-colors truncate block"
                              >
                                {a.companyName}
                              </Link>
                              <p className="text-xs text-slate-400">
                                {a.industry} · {a.season}
                              </p>
                            </div>
                            <StatusBadge status={a.status} size="sm" />
                            <button
                              className="btn btn-ghost btn-sm gap-1 text-slate-500 hover:text-indigo-600 hidden sm:flex"
                              onClick={() => setReassignModal(a.companyName)}
                            >
                              <RefreshCw size={13} />
                              Reassign
                            </button>
                            <button
                              className="sm:hidden btn btn-ghost btn-sm btn-icon text-slate-400 hover:text-indigo-600"
                              onClick={() => setReassignModal(a.companyName)}
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
                  className="flex items-center gap-4 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <button
                    onClick={() => toggleSelectUnassigned(c.companyId)}
                    className="text-slate-300 group-hover:text-slate-400 hover:text-indigo-500! transition-colors shrink-0"
                  >
                    {selectedUnassigned.has(c.companyId) ? (
                      <CheckCircle2 size={16} className="text-indigo-500" />
                    ) : (
                      <div className="w-4 h-4 rounded border border-slate-300 group-hover:border-indigo-300" />
                    )}
                  </button>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 text-xs font-semibold shrink-0">
                    {c.companyName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/companies/${c.companyId}`}
                      className="text-sm font-medium text-slate-900 hover:text-indigo-600 transition-colors truncate block"
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
