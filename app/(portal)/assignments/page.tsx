"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserPlus,
  RefreshCw,
} from "lucide-react";
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
  companySeasonCycleId: string;
  companyId: string;
  companyName: string;
  industry: string | null;
  status: string;
  coordinatorId: string;
  coordinatorName: string;
  seasonId: string;
  season: string;
  assignedAt: string;
};

type UnassignedCycle = {
  companySeasonCycleId: string;
  companyId: string;
  companyName: string;
  industry: string | null;
  status: string;
  seasonId: string;
  season: string;
  updatedAt: string;
};

type AssignmentsDashboardResponse = {
  coordinators: Array<{
    id: string;
    name: string;
    coordinatorType?: string | null;
  }>;
  assignments: AssignmentListItem[];
  unassignedCycles: UnassignedCycle[];
};

type SeasonRecord = {
  id: string;
  name: string;
  seasonType: "intern" | "placement";
  academicYear: string;
  isActive: boolean;
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
  companies: UnassignedCycle[];
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
          ? "Bulk Assign Season Cycles"
          : `Assign - ${companies[0]?.companyName || "Season Cycle"}`
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
  const [selectedSeasonId, setSelectedSeasonId] = useState("");

  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [seasons, setSeasons] = useState<SeasonRecord[]>([]);
  const [assignments, setAssignments] = useState<AssignmentListItem[]>([]);
  const [unassignedCycles, setUnassignedCycles] = useState<UnassignedCycle[]>(
    [],
  );

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isAssignSubmitting, setIsAssignSubmitting] = useState(false);
  const [isReassignSubmitting, setIsReassignSubmitting] = useState(false);

  const [assignModal, setAssignModal] = useState<{
    companies: UnassignedCycle[];
    bulk: boolean;
  } | null>(null);
  const [reassignModal, setReassignModal] = useState<AssignmentListItem | null>(
    null,
  );
  const [selectedUnassigned, setSelectedUnassigned] = useState<Set<string>>(
    new Set(),
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  /* ── Sticky stats-card ── */
  const statsCardRef = useRef<HTMLDivElement>(null);
  const [stickyTop, setStickyTop] = useState(16);

  const loadAssignmentsData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [response, seasonList] = await Promise.all([
        requestApi<AssignmentsDashboardResponse>("/api/v1/assignments"),
        requestApi<SeasonRecord[]>("/api/v1/seasons"),
      ]);

      setCoordinators(
        response.coordinators.map((coordinator) => ({
          ...coordinator,
          avatar: getInitials(coordinator.name),
        })),
      );
      setSeasons(seasonList);
      setAssignments(response.assignments);
      setUnassignedCycles(response.unassignedCycles);
      setSelectedSeasonId((current) => {
        if (current && seasonList.some((season) => season.id === current)) {
          return current;
        }

        return (
          seasonList.find((season) => season.isActive)?.id ??
          seasonList[0]?.id ??
          ""
        );
      });
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
        unassignedCycles.map((cycle) => cycle.companySeasonCycleId),
      );
      return new Set(Array.from(previous).filter((id) => validIds.has(id)));
    });
  }, [unassignedCycles]);

  const coordinatorOptions = useMemo(
    () =>
      coordinators.map((coordinator) => ({
        value: coordinator.id,
        label: coordinator.name,
      })),
    [coordinators],
  );

  const seasonOptions = useMemo(
    () =>
      seasons.map((season) => ({
        value: season.id,
        label: `${season.name} (${season.academicYear})`,
      })),
    [seasons],
  );

  const stats = useMemo(() => {
    const assignmentCountByCoordinator = new Map<string, number>();
    for (const assignment of assignments.filter(
      (item) => !selectedSeasonId || item.seasonId === selectedSeasonId,
    )) {
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
      assigned: assignments.filter(
        (item) => !selectedSeasonId || item.seasonId === selectedSeasonId,
      ).length,
      unassigned: unassignedCycles.filter(
        (item) => !selectedSeasonId || item.seasonId === selectedSeasonId,
      ).length,
      byCoord,
    };
  }, [coordinators, assignments, unassignedCycles, selectedSeasonId]);

  const totalCycles = stats.assigned + stats.unassigned;

  /* ── Recalc sticky top when content changes ── */
  useEffect(() => {
    const el = statsCardRef.current;
    if (!el) return;

    const recalc = () => {
      // Measure the actual card content, not the flex-stretched container
      const child = el.firstElementChild as HTMLElement | null;
      const cardH = child ? child.getBoundingClientRect().height : el.scrollHeight;
      const vh = window.innerHeight;
      // Stick so the card's bottom edge aligns with the viewport bottom.
      // When card is shorter than viewport, stick near the top (16px gap).
      // When card is taller, top goes negative so the card scrolls up first.
      const computed = vh - cardH - 24;
      const top = cardH < vh - 40 ? 16 : computed;
      setStickyTop(top);
    };

    recalc();

    const ro = new ResizeObserver(recalc);
    ro.observe(el);
    const child = el.firstElementChild;
    if (child) ro.observe(child);
    window.addEventListener("resize", recalc);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recalc);
    };
  }, [isLoading, totalCycles]);
  const assignedRatio =
    totalCycles > 0 ? Math.round((stats.assigned / totalCycles) * 100) : 0;
  const seasonAssignments = assignments.filter(
    (item) => !selectedSeasonId || item.seasonId === selectedSeasonId,
  );
  const seasonUnassigned = unassignedCycles.filter(
    (item) => !selectedSeasonId || item.seasonId === selectedSeasonId,
  );
  const statusCycles = [...seasonAssignments, ...seasonUnassigned];
  const acceptedCount = statusCycles.filter(
    (item) => item.status === "accepted",
  ).length;
  const positiveCount = statusCycles.filter(
    (item) => item.status === "positive" || item.status === "accepted",
  ).length;
  const notContactedCount = statusCycles.filter(
    (item) => item.status === "not_contacted",
  ).length;
  const acceptedRatio =
    totalCycles > 0 ? Math.round((acceptedCount / totalCycles) * 100) : 0;
  const statsCardItems = [
    {
      label: "Total",
      value: totalCycles,
      sub: "Season cycles",
    },
    {
      label: "Accepted",
      value: acceptedCount,
      sub: "Confirmed JD",
    },
    {
      label: "Positive",
      value: positiveCount,
      sub: "Responded well",
    },
    {
      label: "Pending",
      value: notContactedCount,
      sub: "Not contacted",
    },
  ];
  const r = 46;
  const circ = 2 * Math.PI * r;
  const assignedFilled =
    totalCycles > 0 ? (stats.assigned / totalCycles) * circ : 0;
  const acceptedFilled =
    totalCycles > 0 ? (acceptedCount / totalCycles) * circ : 0;

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

    if (selectedSeasonId) {
      data = data.filter(
        (assignment) => assignment.seasonId === selectedSeasonId,
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
  }, [assignments, search, statusFilter, coordinatorFilter, selectedSeasonId]);

  const filteredUnassigned = useMemo(() => {
    let data = unassignedCycles;

    if (search) {
      const query = search.toLowerCase();
      data = data.filter((company) =>
        company.companyName.toLowerCase().includes(query),
      );
    }

    if (selectedSeasonId) {
      data = data.filter((company) => company.seasonId === selectedSeasonId);
    }

    return data;
  }, [unassignedCycles, search, selectedSeasonId]);

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
      await requestApi("/api/v1/assignments/bulk", {
        method: "POST",
        body: JSON.stringify({
          assignments: assignModal.companies.map((company) => ({
            companySeasonCycleId: company.companySeasonCycleId,
            assigneeUserId: input.assigneeUserId,
            notes: input.notes,
          })),
        }),
      });

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
        `/api/v1/assignments/${reassignModal.companySeasonCycleId}/reassign`,
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
    <div className="-mt-6 xl:mt-0 space-y-5 pl-4 pr-4 pb-6 animate-fade-in">
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

      <div className="flex flex-col gap-5 pt-6 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1 space-y-5">
          <div className="card overflow-visible flex flex-col">
            <div className="px-4 py-3 border-b border-(--card-border)">
              <div
                className={`flex gap-2 items-center ${
                  tab === "assigned" ? "flex-col xl:flex-row xl:flex-wrap" : ""
                }`}
              >
                <select
                  className={`input-base min-w-0 ${
                    tab === "assigned" ? "xl:min-w-65 xl:max-w-80" : "flex-1"
                  }`}
                  value={selectedSeasonId}
                  onChange={(event) => setSelectedSeasonId(event.target.value)}
                >
                  <option value="">Select season</option>
                  {seasonOptions.map((season) => (
                    <option key={season.value} value={season.value}>
                      {season.label}
                    </option>
                  ))}
                </select>
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
                        companies: unassignedCycles.filter((company) =>
                          selectedUnassigned.has(company.companySeasonCycleId),
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

          <div className="card overflow-hidden">
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
                            <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-xs font-semibold">
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
                                key={assignment.companySeasonCycleId}
                                className="flex items-center gap-5 px-4 py-3 hover:bg-[#F5F9FF] transition-colors"
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
                                <div className="hidden w-30 shrink-0 items-center justify-center sm:flex">
                                  <StatusBadge
                                    status={assignment.status}
                                    size="sm"
                                  />
                                </div>
                                <div className="hidden w-32 shrink-0 items-center justify-center sm:flex">
                                  <button
                                    className="btn btn-ghost btn-sm gap-1 text-slate-500 hover:text-[#2563EB] justify-center"
                                    onClick={() => setReassignModal(assignment)}
                                  >
                                    <RefreshCw size={13} />
                                    Reassign
                                  </button>
                                </div>
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
                    title="All season cycles are assigned!"
                    description="Every season-cycle task has been assigned to a coordinator."
                  />
                ) : (
                  filteredUnassigned.map((company) => (
                    <div
                      key={company.companySeasonCycleId}
                      className="flex items-center gap-4 p-3 border border-[#DBEAFE] rounded-xl hover:bg-[#F5F9FF] transition-colors group"
                    >
                      <button
                        onClick={() =>
                          toggleSelectUnassigned(company.companySeasonCycleId)
                        }
                        className="text-slate-300 group-hover:text-slate-400 hover:text-[#2563EB]! transition-colors shrink-0"
                      >
                        {selectedUnassigned.has(
                          company.companySeasonCycleId,
                        ) ? (
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
                          {company.industry || "Unspecified"} · {company.season}
                        </p>
                      </div>
                      <Badge variant="warning" size="sm" dot>
                        {company.status.replace(/_/g, " ")}
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

        <div
          ref={statsCardRef}
          className="w-full xl:w-80 xl:self-start xl:sticky"
          style={{ top: `${stickyTop}px` }}
        >
          <div className="card overflow-hidden border border-(--card-border)">
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

            {isLoading ? (
              <div className="space-y-3 p-3">
                <div className="shimmer mx-auto h-44 w-44 rounded-full" />
                <div className="shimmer h-12 w-full rounded-lg" />
                <div className="shimmer h-12 w-full rounded-lg" />
                <div className="shimmer h-12 w-full rounded-lg" />
                <div className="shimmer h-12 w-full rounded-lg" />
              </div>
            ) : totalCycles === 0 ? (
              <div className="px-4 py-6 text-center text-sm font-medium text-slate-500">
                No assignments yet
              </div>
            ) : (
              <>
                <div className="xl:hidden">
                  <div className="grid grid-cols-1 divide-y divide-(--card-border)">
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
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
                            strokeDasharray={`${assignedFilled} ${circ - assignedFilled}`}
                            strokeDashoffset={circ * 0.25}
                            style={{ transition: "stroke-dasharray 0.6s ease" }}
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span
                            className="text-2xl font-extrabold leading-none"
                            style={{ color: "#2563EB" }}
                          >
                            {assignedRatio}%
                          </span>
                          <span
                            className="text-[11px] font-medium mt-0.5"
                            style={{ color: "var(--muted)" }}
                          >
                            assigned
                          </span>
                        </div>
                      </div>
                      <p
                        className="text-[11px] font-semibold uppercase tracking-widest"
                        style={{ color: "var(--muted)" }}
                      >
                        Assigned / Total
                      </p>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
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
                            strokeDasharray={`${acceptedFilled} ${circ - acceptedFilled}`}
                            strokeDashoffset={circ * 0.25}
                            style={{ transition: "stroke-dasharray 0.6s ease" }}
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span
                            className="text-2xl font-extrabold leading-none"
                            style={{ color: "#2563EB" }}
                          >
                            {acceptedRatio}%
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
                  </div>

                  <div className="flex flex-col divide-y divide-(--card-border)">
                    {statsCardItems.map(({ label, value }) => (
                      <div
                        key={`${label}-mobile`}
                        className="flex items-center gap-2 px-3 py-2.5 flex-1"
                      >
                        <div
                          className="w-1 self-stretch rounded-full shrink-0 my-0.5"
                          style={{ background: "#2563EB" }}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-[12px] font-bold uppercase tracking-wider leading-none"
                            style={{ color: "#2563EB" }}
                          >
                            {label}
                          </p>
                        </div>
                        <span
                          className="text-xl font-extrabold shrink-0"
                          style={{ color: "#2563EB" }}
                        >
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="hidden xl:flex flex-col items-center pt-6 pb-5 px-4 gap-1 border-b border-(--card-border)">
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
                        strokeDasharray={`${assignedFilled} ${circ - assignedFilled}`}
                        strokeDashoffset={circ * 0.25}
                        style={{ transition: "stroke-dasharray 0.6s ease" }}
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span
                        className="text-2xl font-extrabold leading-none"
                        style={{ color: "#2563EB" }}
                      >
                        {assignedRatio}%
                      </span>
                      <span
                        className="text-[11px] font-medium mt-0.5"
                        style={{ color: "var(--muted)" }}
                      >
                        assigned
                      </span>
                    </div>
                  </div>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-widest"
                    style={{ color: "var(--muted)" }}
                  >
                    Assigned / Total
                  </p>
                </div>

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
                        strokeDasharray={`${acceptedFilled} ${circ - acceptedFilled}`}
                        strokeDashoffset={circ * 0.25}
                        style={{ transition: "stroke-dasharray 0.6s ease" }}
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span
                        className="text-2xl font-extrabold leading-none"
                        style={{ color: "#2563EB" }}
                      >
                        {acceptedRatio}%
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

                <div className="hidden xl:flex xl:flex-col xl:flex-1 gap-5 px-3 pb-3">
                  {statsCardItems.map(({ label, value, sub }) => (
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
              </>
            )}
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
