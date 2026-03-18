"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
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

type Coordinator = {
  id: string;
  name: string;
  avatar: string;
  coordinatorType?: string | null;
};

type AssignmentListItem = {
  assignmentId: string;
  companyId: string;
  companyName: string;
  industry: string | null;
  status: string;
  coordinatorId: string;
  coordinatorName: string;
  season: string;
  assignedAt: string;
};

type UnassignedCompany = {
  companyId: string;
  companyName: string;
  industry: string | null;
};

type AssignmentsDashboardResponse = {
  coordinators: Array<{
    id: string;
    name: string;
    coordinatorType?: string | null;
  }>;
  assignments: AssignmentListItem[];
  unassignedCompanies: UnassignedCompany[];
};

type ApiErrorEnvelope = {
  error?: {
    message?: string;
  };
};

type ApiSuccessEnvelope<T> = {
  data: T;
};

const STATUS_OPTIONS = [
  { value: "not_contacted", label: "Not Contacted" },
  { value: "contacted", label: "Contacted" },
  { value: "positive", label: "Positive" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];

const PIE_COLORS = ["#2563EB", "#E2E8F0"];
const BAR_COLORS = ["#2563EB", "#3B82F6", "#BFDBFE", "#DBEAFE"];

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

async function requestApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiSuccessEnvelope<T>
    | ApiErrorEnvelope
    | null;

  if (!response.ok) {
    throw new Error(
      payload && "error" in payload && payload.error?.message
        ? payload.error.message
        : "Request failed",
    );
  }

  if (!payload || !("data" in payload)) {
    throw new Error("Invalid server response");
  }

  return payload.data;
}

function AssignModal({
  isOpen,
  onClose,
  companies,
  isBulk,
  coordinators,
  isSubmitting,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  companies: UnassignedCompany[];
  isBulk: boolean;
  coordinators: Coordinator[];
  isSubmitting: boolean;
  onSubmit: (input: {
    assigneeUserId: string;
    notes?: string;
  }) => Promise<void>;
}) {
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!assigneeUserId) {
      setFormError("Please select a coordinator");
      return;
    }

    try {
      setFormError(null);
      await onSubmit({
        assigneeUserId,
        notes: notes.trim() || undefined,
      });
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to assign companies",
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isBulk
          ? "Bulk Assign Companies"
          : `Assign - ${companies[0]?.companyName || "Company"}`
      }
      size="md"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            <UserCheck size={14} />
            {isSubmitting ? "Assigning..." : "Assign"}
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
          <select
            className="input-base"
            value={assigneeUserId}
            onChange={(event) => setAssigneeUserId(event.target.value)}
            disabled={isSubmitting}
          >
            <option value="">-- Select Coordinator --</option>
            {coordinators.map((coordinator) => (
              <option key={coordinator.id} value={coordinator.id}>
                {coordinator.name}
              </option>
            ))}
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
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={isSubmitting}
          />
        </div>

        {formError && (
          <p className="text-xs font-medium text-red-600">{formError}</p>
        )}
      </div>
    </Modal>
  );
}

function ReassignModal({
  isOpen,
  onClose,
  assignment,
  coordinators,
  isSubmitting,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  assignment: AssignmentListItem;
  coordinators: Coordinator[];
  isSubmitting: boolean;
  onSubmit: (input: {
    newAssigneeUserId: string;
    reason: string;
  }) => Promise<void>;
}) {
  const [newAssigneeUserId, setNewAssigneeUserId] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!newAssigneeUserId) {
      setFormError("Please select a coordinator");
      return;
    }

    if (!reason.trim()) {
      setFormError("Reason is required");
      return;
    }

    try {
      setFormError(null);
      await onSubmit({
        newAssigneeUserId,
        reason: reason.trim(),
      });
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to reassign company",
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Reassign - ${assignment.companyName}`}
      size="sm"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            <RefreshCw size={14} />
            {isSubmitting ? "Reassigning..." : "Reassign"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            New Coordinator *
          </label>
          <select
            className="input-base"
            value={newAssigneeUserId}
            onChange={(event) => setNewAssigneeUserId(event.target.value)}
            disabled={isSubmitting}
          >
            <option value="">-- Select --</option>
            {coordinators
              .filter(
                (coordinator) => coordinator.id !== assignment.coordinatorId,
              )
              .map((coordinator) => (
                <option key={coordinator.id} value={coordinator.id}>
                  {coordinator.name}
                </option>
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
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={isSubmitting}
          />
        </div>

        {formError && (
          <p className="text-xs font-medium text-red-600">{formError}</p>
        )}
      </div>
    </Modal>
  );
}

function AssignedGroupsSkeleton({
  groups = 3,
  rowsPerGroup = 2,
}: {
  groups?: number;
  rowsPerGroup?: number;
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: groups }).map((_, groupIndex) => (
        <div
          key={groupIndex}
          className="overflow-hidden rounded-xl border border-[#DBEAFE]"
        >
          <div className="flex items-center justify-between bg-[#F5F9FF] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="shimmer h-8 w-8 rounded-full" />
              <div className="space-y-1.5">
                <div className="shimmer h-3 w-28 rounded-full" />
                <div className="shimmer h-2.5 w-20 rounded-full" />
              </div>
            </div>
            <div className="shimmer h-5 w-10 rounded-full" />
          </div>
          <div className="divide-y divide-[#EFF6FF]">
            {Array.from({ length: rowsPerGroup }).map((__, rowIndex) => (
              <div key={rowIndex} className="flex items-center gap-4 px-4 py-3">
                <div className="shimmer h-8 w-8 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="shimmer h-3.5 w-40 rounded-full" />
                  <div className="shimmer h-2.5 w-28 rounded-full" />
                </div>
                <div className="shimmer h-7 w-20 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function UnassignedListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-xl border border-[#DBEAFE] p-3"
        >
          <div className="shimmer h-4 w-4 rounded" />
          <div className="shimmer h-8 w-8 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="shimmer h-3.5 w-40 rounded-full" />
            <div className="shimmer h-2.5 w-28 rounded-full" />
          </div>
          <div className="shimmer h-6 w-20 rounded-full" />
          <div className="shimmer h-8 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export default function AssignmentsPage() {
  const [tab, setTab] = useState<"assigned" | "unassigned">("assigned");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [coordinatorFilter, setCoordinatorFilter] = useState<string[]>([]);

  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [assignments, setAssignments] = useState<AssignmentListItem[]>([]);
  const [unassignedCompanies, setUnassignedCompanies] = useState<
    UnassignedCompany[]
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isAssignSubmitting, setIsAssignSubmitting] = useState(false);
  const [isReassignSubmitting, setIsReassignSubmitting] = useState(false);

  const [assignModal, setAssignModal] = useState<{
    companies: UnassignedCompany[];
    bulk: boolean;
  } | null>(null);
  const [reassignModal, setReassignModal] = useState<AssignmentListItem | null>(
    null,
  );
  const [selectedUnassigned, setSelectedUnassigned] = useState<Set<string>>(
    new Set(),
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const loadAssignmentsData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await requestApi<AssignmentsDashboardResponse>(
        "/api/v1/assignments",
      );

      setCoordinators(
        response.coordinators.map((coordinator) => ({
          ...coordinator,
          avatar: getInitials(coordinator.name),
        })),
      );
      setAssignments(response.assignments);
      setUnassignedCompanies(response.unassignedCompanies);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Failed to load assignment dashboard",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAssignmentsData();
  }, [loadAssignmentsData]);

  useEffect(() => {
    setSelectedUnassigned((previous) => {
      const validIds = new Set(
        unassignedCompanies.map((company) => company.companyId),
      );
      return new Set(Array.from(previous).filter((id) => validIds.has(id)));
    });
  }, [unassignedCompanies]);

  const coordinatorOptions = useMemo(
    () =>
      coordinators.map((coordinator) => ({
        value: coordinator.id,
        label: coordinator.name,
      })),
    [coordinators],
  );

  const stats = useMemo(() => {
    const assignmentCountByCoordinator = new Map<string, number>();
    for (const assignment of assignments) {
      assignmentCountByCoordinator.set(
        assignment.coordinatorId,
        (assignmentCountByCoordinator.get(assignment.coordinatorId) ?? 0) + 1,
      );
    }

    const byCoord = coordinators.map((coordinator) => ({
      id: coordinator.id,
      name: coordinator.name,
      shortName: coordinator.name.split(" ")[0] || coordinator.name,
      avatar: coordinator.avatar,
      companies: assignmentCountByCoordinator.get(coordinator.id) ?? 0,
    }));

    return {
      assigned: assignments.length,
      unassigned: unassignedCompanies.length,
      byCoord,
    };
  }, [coordinators, assignments, unassignedCompanies]);

  const topCoordinatorLoads = useMemo(
    () =>
      [...stats.byCoord]
        .sort((left, right) => right.companies - left.companies)
        .slice(0, 5)
        .map((coordinator) => ({
          ...coordinator,
          percent:
            stats.assigned > 0
              ? Math.round((coordinator.companies / stats.assigned) * 100)
              : 0,
        })),
    [stats.assigned, stats.byCoord],
  );

  const pieData = [
    { name: "Assigned", value: stats.assigned },
    { name: "Unassigned", value: stats.unassigned },
  ];

  const filteredAssigned = useMemo(() => {
    let data = assignments;

    if (search) {
      const query = search.toLowerCase();
      data = data.filter(
        (assignment) =>
          assignment.companyName.toLowerCase().includes(query) ||
          assignment.coordinatorName.toLowerCase().includes(query),
      );
    }

    if (statusFilter.length > 0) {
      data = data.filter((assignment) =>
        statusFilter.includes(assignment.status),
      );
    }

    if (coordinatorFilter.length > 0) {
      data = data.filter((assignment) =>
        coordinatorFilter.includes(assignment.coordinatorId),
      );
    }

    return data;
  }, [assignments, search, statusFilter, coordinatorFilter]);

  const filteredUnassigned = useMemo(() => {
    let data = unassignedCompanies;

    if (search) {
      const query = search.toLowerCase();
      data = data.filter((company) =>
        company.companyName.toLowerCase().includes(query),
      );
    }

    return data;
  }, [unassignedCompanies, search]);

  const groupedByCoordinator = useMemo(() => {
    const groups: Record<string, AssignmentListItem[]> = {};

    for (const assignment of filteredAssigned) {
      if (!groups[assignment.coordinatorName]) {
        groups[assignment.coordinatorName] = [];
      }
      groups[assignment.coordinatorName].push(assignment);
    }

    return groups;
  }, [filteredAssigned]);

  useEffect(() => {
    setExpandedGroups((previous) => {
      const groupNames = Object.keys(groupedByCoordinator);
      if (groupNames.length === 0) {
        return new Set();
      }

      if (previous.size === 0) {
        return new Set(groupNames);
      }

      const next = new Set<string>();
      for (const name of groupNames) {
        if (previous.has(name)) {
          next.add(name);
        }
      }

      return next.size > 0 ? next : new Set(groupNames);
    });
  }, [groupedByCoordinator]);

  const toggleGroup = (name: string) => {
    setExpandedGroups((previous) => {
      const next = new Set(previous);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const toggleSelectUnassigned = (id: string) => {
    setSelectedUnassigned((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAssignSubmit = async (input: {
    assigneeUserId: string;
    notes?: string;
  }) => {
    if (!assignModal || assignModal.companies.length === 0) return;

    setIsAssignSubmitting(true);
    try {
      if (assignModal.bulk) {
        await requestApi("/api/v1/assignments/bulk", {
          method: "POST",
          body: JSON.stringify({
            assignments: assignModal.companies.map((company) => ({
              itemType: "company",
              itemId: company.companyId,
              assigneeUserId: input.assigneeUserId,
              notes: input.notes,
            })),
          }),
        });
      } else {
        await requestApi("/api/v1/assignments", {
          method: "POST",
          body: JSON.stringify({
            itemType: "company",
            itemId: assignModal.companies[0].companyId,
            assigneeUserId: input.assigneeUserId,
            notes: input.notes,
          }),
        });
      }

      await loadAssignmentsData();
      setAssignModal(null);
      setSelectedUnassigned(new Set());
    } finally {
      setIsAssignSubmitting(false);
    }
  };

  const handleReassignSubmit = async (input: {
    newAssigneeUserId: string;
    reason: string;
  }) => {
    if (!reassignModal) return;

    setIsReassignSubmitting(true);
    try {
      await requestApi(
        `/api/v1/assignments/${reassignModal.assignmentId}/reassign`,
        {
          method: "PUT",
          body: JSON.stringify(input),
        },
      );

      await loadAssignmentsData();
      setReassignModal(null);
    } finally {
      setIsReassignSubmitting(false);
    }
  };

  const tabs = [
    { key: "assigned" as const, label: "Assigned", count: stats.assigned },
    {
      key: "unassigned" as const,
      label: "Unassigned",
      count: stats.unassigned,
    },
  ];

  const activeFilterCount = statusFilter.length + coordinatorFilter.length;

  return (
    <div className="-mt-6 xl:mt-0 space-y-5 pl-4 pr-4 pb-6 animate-fade-in xl:h-full xl:overflow-y-auto hide-scrollbar">
      {loadError && (
        <div className="card px-4 py-3 border border-red-200 bg-red-50/60">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-red-700">{loadError}</p>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => void loadAssignmentsData()}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <div
        className={`flex flex-col gap-5 pt-6 xl:flex-row ${
          isLoading ? "xl:items-stretch" : "xl:items-start"
        }`}
      >
        <div className="min-w-0 flex-1 space-y-5 xl:flex xl:flex-col">
          <div className="card overflow-visible flex flex-col">
            <div className="px-4 py-3 border-b border-(--card-border)">
              <div
                className={`flex gap-2 ${
                  tab === "assigned"
                    ? "flex-col xl:flex-row xl:flex-wrap xl:items-center"
                    : "flex-col sm:flex-row sm:items-center"
                }`}
              >
                <SearchBar
                  value={search}
                  onChange={setSearch}
                  placeholder={
                    tab === "assigned"
                      ? "Search company or coordinator..."
                      : "Search company..."
                  }
                  className={`min-w-0 ${
                    tab === "assigned"
                      ? "xl:min-w-[320px] xl:flex-[1.2]"
                      : "flex-1"
                  }`}
                />

                {tab === "assigned" && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:w-auto xl:shrink-0">
                    <FilterSelect
                      multiple
                      value={statusFilter}
                      onChange={setStatusFilter}
                      options={STATUS_OPTIONS}
                      placeholder="Status"
                      className="z-20 w-full xl:w-44"
                    />
                    <FilterSelect
                      multiple
                      value={coordinatorFilter}
                      onChange={setCoordinatorFilter}
                      options={coordinatorOptions}
                      placeholder="Coordinator"
                      className="z-20 w-full xl:w-44"
                    />
                  </div>
                )}

                {tab === "assigned" && activeFilterCount > 0 && (
                  <button
                    className="btn btn-ghost btn-sm shrink-0 self-start text-slate-500 hover:text-slate-700 xl:self-auto"
                    onClick={() => {
                      setStatusFilter([]);
                      setCoordinatorFilter([]);
                    }}
                  >
                    Clear all
                  </button>
                )}

                {tab === "unassigned" && selectedUnassigned.size > 0 && (
                  <button
                    className="btn btn-primary btn-sm gap-1 shrink-0"
                    onClick={() =>
                      setAssignModal({
                        companies: unassignedCompanies.filter((company) =>
                          selectedUnassigned.has(company.companyId),
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
          </div>

          <div className="card overflow-hidden xl:flex-1">
            <div className="border-b border-[#DBEAFE] flex items-center justify-between px-4">
              <div className="flex">
                {tabs.map((tabItem) => (
                  <button
                    key={tabItem.key}
                    onClick={() => setTab(tabItem.key)}
                    className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all
                      ${
                        tab === tabItem.key
                          ? "border-[#2563EB] text-[#2563EB]"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    {tabItem.label}
                    <span
                      className={`text-xs rounded-full px-1.5 py-0.5 font-semibold
                      ${
                        tab === tabItem.key
                          ? "bg-[#DBEAFE] text-[#1D4ED8]"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {tabItem.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {tab === "assigned" && (
              <div className="p-4 space-y-3">
                {isLoading ? (
                  <AssignedGroupsSkeleton groups={5} rowsPerGroup={3} />
                ) : Object.keys(groupedByCoordinator).length === 0 ? (
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
                        <button
                          className="w-full flex items-center justify-between px-4 py-3 bg-slate-100 transition-colors"
                          onClick={() => toggleGroup(coordinatorName)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#1D4ED8] text-xs font-semibold">
                              {coordinatorName
                                .split(" ")
                                .map((name) => name[0])
                                .join("")}
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-semibold text-black">
                                {coordinatorName}
                              </p>
                              {/* <p className="text-xs text-slate-500">
                                {entries.length} companies assigned
                              </p> */}
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

                        {expandedGroups.has(coordinatorName) && (
                          <div className="divide-y divide-[#EFF6FF]">
                            {entries.map((assignment) => (
                              <div
                                key={assignment.assignmentId}
                                className="flex items-center gap-4 px-4 py-3 hover:bg-[#F5F9FF] transition-colors"
                              >
                                <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center text-[#1D4ED8] text-xs font-semibold shrink-0">
                                  {assignment.companyName.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <Link
                                    href={`/companies/${assignment.companyId}`}
                                    className="text-sm font-medium text-slate-900 hover:text-[#2563EB] transition-colors truncate block"
                                  >
                                    {assignment.companyName}
                                  </Link>
                                  <p className="text-xs text-slate-400">
                                    {assignment.industry || "Unspecified"} ·{" "}
                                    {assignment.season}
                                  </p>
                                </div>
                                {/* <StatusBadge
                                  status={assignment.status}
                                  size="sm"
                                /> */}
                                <button
                                  className="btn btn-ghost btn-sm gap-1 text-slate-500 hover:text-[#2563EB] hidden sm:flex"
                                  onClick={() => setReassignModal(assignment)}
                                >
                                  <RefreshCw size={13} />
                                  Reassign
                                </button>
                                {/* <button
                                  className="sm:hidden btn btn-ghost btn-sm btn-icon text-slate-400 hover:text-[#2563EB]"
                                  onClick={() => setReassignModal(assignment)}
                                >
                                  <RefreshCw size={14} />
                                </button> */}
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

            {tab === "unassigned" && (
              <div className="p-4 space-y-2">
                {isLoading ? (
                  <UnassignedListSkeleton />
                ) : filteredUnassigned.length === 0 ? (
                  <EmptyState
                    icon={CheckCircle2}
                    title="All companies are assigned!"
                    description="Every company in this season has been assigned to a coordinator."
                  />
                ) : (
                  filteredUnassigned.map((company) => (
                    <div
                      key={company.companyId}
                      className="flex items-center gap-4 p-3 border border-[#DBEAFE] rounded-xl hover:bg-[#F5F9FF] transition-colors group"
                    >
                      <button
                        onClick={() =>
                          toggleSelectUnassigned(company.companyId)
                        }
                        className="text-slate-300 group-hover:text-slate-400 hover:text-[#2563EB]! transition-colors shrink-0"
                      >
                        {selectedUnassigned.has(company.companyId) ? (
                          <CheckCircle2 size={16} className="text-[#2563EB]" />
                        ) : (
                          <div className="w-4 h-4 rounded border border-slate-300 group-hover:border-[#3B82F6]" />
                        )}
                      </button>
                      <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center text-[#1D4ED8] text-xs font-semibold shrink-0">
                        {company.companyName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/companies/${company.companyId}`}
                          className="text-sm font-medium text-slate-900 hover:text-[#2563EB] transition-colors truncate block"
                        >
                          {company.companyName}
                        </Link>
                        <p className="text-xs text-slate-400">
                          {company.industry || "Unspecified"}
                        </p>
                      </div>
                      <Badge variant="warning" size="sm" dot>
                        Unassigned
                      </Badge>
                      <button
                        className="btn btn-primary btn-sm gap-1 shrink-0"
                        onClick={() =>
                          setAssignModal({ companies: [company], bulk: false })
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

        <div className="w-full space-y-5 xl:sticky xl:top-4 xl:w-90">
          <div className="card overflow-hidden border border-[#DBEAFE]">
            <div className="flex items-center gap-2 border-b border-[#DBEAFE] px-4 py-3">
              <PieChartIcon size={14} className="text-[#2563EB]" />
              <h3 className="text-sm font-semibold text-slate-800">
                Assigned Ratio
              </h3>
            </div>
            {isLoading ? (
              <div className="space-y-3 p-4">
                <div className="shimmer mx-auto h-52 w-52 rounded-full" />
                <div className="shimmer mx-auto h-3 w-44 rounded-full" />
              </div>
            ) : (
              <div className="p-4">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={74}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell key={index} fill={PIE_COLORS[index]} />
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
                <p className="mt-2 text-center text-xs text-slate-500">
                  {stats.assigned} assigned | {stats.unassigned} unassigned
                </p>
              </div>
            )}
          </div>

          <div className="card overflow-hidden border border-[#DBEAFE]">
            <div className="flex items-center gap-2 border-b border-[#DBEAFE] px-4 py-3">
              <BarChart3 size={14} className="text-[#2563EB]" />
              <h3 className="text-sm font-semibold text-slate-800">
                Coordinator Load
              </h3>
            </div>
            {isLoading ? (
              <div className="space-y-3 p-4">
                <div className="shimmer h-56 w-full rounded-xl" />
              </div>
            ) : (
              <div className="p-4">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.byCoord}
                      margin={{ top: 0, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#EFF6FF" />
                      <XAxis
                        dataKey="shortName"
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
                        {stats.byCoord.map((_, index) => (
                          <Cell
                            key={index}
                            fill={BAR_COLORS[index % BAR_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          <div className="card overflow-hidden border border-[#DBEAFE]">
            <div className="flex items-center gap-2 border-b border-[#DBEAFE] px-4 py-3">
              <Users size={14} className="text-[#2563EB]" />
              <h3 className="text-sm font-semibold text-slate-800">
                Top 5 Loads
              </h3>
            </div>
            <div className="divide-y divide-[#EFF6FF]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className="shimmer h-8 w-8 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="shimmer h-3.5 w-32 rounded-full" />
                      <div className="shimmer h-1.5 w-full rounded-full" />
                    </div>
                    <div className="shimmer h-4 w-6 rounded-full" />
                  </div>
                ))
              ) : topCoordinatorLoads.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  No assignments available.
                </div>
              ) : (
                topCoordinatorLoads.map((coordinator) => (
                  <div
                    key={coordinator.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[#F5F9FF] transition-colors"
                  >
                    <div className="h-8 w-8 shrink-0 rounded-full bg-[#DBEAFE] flex items-center justify-center text-xs font-semibold text-[#1D4ED8]">
                      {coordinator.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {coordinator.name}
                      </p>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#EFF6FF]">
                        <div
                          className="h-full rounded-full bg-[#2563EB] transition-all"
                          style={{ width: `${coordinator.percent}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-slate-700">
                      {coordinator.companies}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {assignModal && (
        <AssignModal
          isOpen={!!assignModal}
          onClose={() => {
            setAssignModal(null);
            setSelectedUnassigned(new Set());
          }}
          companies={assignModal.companies}
          isBulk={assignModal.bulk}
          coordinators={coordinators}
          isSubmitting={isAssignSubmitting}
          onSubmit={handleAssignSubmit}
        />
      )}

      {reassignModal && (
        <ReassignModal
          isOpen={!!reassignModal}
          onClose={() => setReassignModal(null)}
          assignment={reassignModal}
          coordinators={coordinators}
          isSubmitting={isReassignSubmitting}
          onSubmit={handleReassignSubmit}
        />
      )}
    </div>
  );
}
