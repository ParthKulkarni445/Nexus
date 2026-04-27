"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  KeyRound,
  Pencil,
  RefreshCw,
  Save,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

type OverviewResponse = {
  totals: {
    totalUsers: number;
    admins: number;
    coordinators: number;
    students: number;
    seasons: number;
    activeSeasons: number;
    customPermissionOverrides: number;
  };
  activeSeasons: Array<{
    id: string;
    name: string;
    seasonType: string;
    academicYear: string;
  }>;
  recentAuditLogs: Array<{
    id: string;
    action: string;
    targetType: string | null;
    targetId: string | null;
    createdAt: string;
    actor: {
      id: string;
      name: string;
      email: string;
    } | null;
  }>;
};

type ManagedPermission = {
  id: string;
  permissionKey: string;
  isAllowed: boolean;
  grantedAt: string;
};

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  coordinatorType: string | null;
  isActive: boolean;
  createdAt: string;
  permissions: ManagedPermission[];
};

type AdminUsersMeta = {
  roles: string[];
  coordinatorTypes: string[];
  permissionKeys: string[];
  coordinatorRole: string;
};

type AdminUsersPayload = {
  users: ManagedUser[];
  meta: AdminUsersMeta;
};

type LogItem = {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
};

type Season = {
  id: string;
  name: string;
  seasonType: string;
  academicYear: string;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
};

type ApiEnvelope<T> = {
  data?: T;
  error?: {
    message?: string;
  };
};

type EditableUserState = {
  name: string;
  phone: string;
  role: string;
  coordinatorType: string | null;
  isActive: boolean;
  permissions: Record<string, boolean>;
};

function formatRole(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayLabel(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function logActionTone(action: string) {
  if (action.includes("create") || action.includes("approve") || action.includes("assign")) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (action.includes("update") || action.includes("reset")) {
    return "bg-amber-100 text-amber-700";
  }
  if (action.includes("reject") || action.includes("delete") || action.includes("cancel")) {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-slate-100 text-slate-700";
}

function buildAcademicYearOptions(count = 6): string[] {
  const now = new Date();
  const baseYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;

  return Array.from({ length: count }, (_, index) => {
    const startYear = baseYear - 1 + index;
    const endShort = String((startYear + 1) % 100).padStart(2, "0");
    return `${startYear}-${endShort}`;
  }).reverse();
}

const ACADEMIC_YEAR_OPTIONS = buildAcademicYearOptions();
const DEFAULT_ACADEMIC_YEAR = ACADEMIC_YEAR_OPTIONS[0] ?? "";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    ...init,
  });

  const rawText = await response.text();
  let body: ApiEnvelope<T> = {};

  if (rawText) {
    try {
      body = JSON.parse(rawText) as ApiEnvelope<T>;
    } catch {
      body = {};
    }
  }

  if (!response.ok) {
    const message = body.error?.message ?? "Request failed";
    throw new Error(message);
  }

  if (!body.data) {
    throw new Error("Unexpected empty response");
  }

  return body.data;
}

function toUserEditState(user: ManagedUser, permissionKeys: string[]): EditableUserState {
  const permissions: Record<string, boolean> = {};

  for (const key of permissionKeys) {
    const match = user.permissions.find((perm) => perm.permissionKey === key);
    permissions[key] = Boolean(match?.isAllowed);
  }

  return {
    name: user.name,
    phone: user.phone ?? "",
    role: user.role,
    coordinatorType: user.coordinatorType,
    isActive: user.isActive,
    permissions,
  };
}

export default function AdminDashboardClient() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [usersMeta, setUsersMeta] = useState<AdminUsersMeta>({
    roles: [],
    coordinatorTypes: [],
    permissionKeys: [],
    coordinatorRole: "coordinator",
  });
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [resetPasswordByUserId, setResetPasswordByUserId] = useState<Record<string, string>>({});
  const [editStateByUserId, setEditStateByUserId] = useState<Record<string, EditableUserState>>({});
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    coordinatorType: "",
    isActive: true,
    password: "",
  });
  const [seasonForm, setSeasonForm] = useState({
    seasonType: "placement" as "placement" | "intern",
    academicYear: DEFAULT_ACADEMIC_YEAR,
    startDate: "",
    endDate: "",
    isActive: true,
  });
  const [creatingSeason, setCreatingSeason] = useState(false);
  const [allSeasons, setAllSeasons] = useState<Season[]>([]);
  const [deletingSeasonId, setDeletingSeasonId] = useState<string | null>(null);
  const [updatingSeasonId, setUpdatingSeasonId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set(["Student"]));
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [groupBy, setGroupBy] = useState<"role" | "status" | "none">("role");
  const [showActiveSeasonsWindow, setShowActiveSeasonsWindow] = useState(false);
  const [activeTab, setActiveTab] = useState<"schedule" | "users" | "seasons" | "logs" | "reports">("schedule");

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const [overviewPayload, usersPayload, logsPayload, seasonsPayload] = await Promise.all([
        requestJson<OverviewResponse>("/api/v1/admin/overview"),
        requestJson<AdminUsersPayload>("/api/v1/admin/users"),
        requestJson<LogItem[]>("/api/v1/admin/system/logs?limit=25"),
        requestJson<Season[]>("/api/v1/seasons"),
      ]);

      setOverview(overviewPayload);
      setUsersMeta(usersPayload.meta);
      setUsers(usersPayload.users);
      setLogs(logsPayload);
      setAllSeasons(seasonsPayload);
      setEditStateByUserId(
        usersPayload.users.reduce<Record<string, EditableUserState>>((acc, user) => {
          acc[user.id] = toUserEditState(user, usersPayload.meta.permissionKeys);
          return acc;
        }, {}),
      );
      setSelectedUserId((prev) => prev ?? usersPayload.users[0]?.id ?? null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load admin data");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!usersMeta.roles.length) {
      return;
    }

    setCreateUserForm((prev) => ({
      ...prev,
      role: prev.role || usersMeta.roles[0],
      coordinatorType: prev.coordinatorType || usersMeta.coordinatorTypes[0] || "",
    }));
  }, [usersMeta.roles, usersMeta.coordinatorTypes]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredUsers = useMemo(() => {
    const searchTerm = userSearch.trim().toLowerCase();

    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) {
        return false;
      }

      if (statusFilter !== "all") {
        const expectedActive = statusFilter === "active";
        if (user.isActive !== expectedActive) {
          return false;
        }
      }

      if (!searchTerm) {
        return true;
      }

      const coordinatorLabel = user.coordinatorType
        ? formatRole(user.coordinatorType)
        : "";

      return (
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        user.role.toLowerCase().includes(searchTerm) ||
        coordinatorLabel.toLowerCase().includes(searchTerm)
      );
    });
  }, [users, userSearch, roleFilter, statusFilter]);

  const groupedUsers = useMemo(() => {
    if (groupBy === "none") {
      return [{ label: "All Users", users: filteredUsers }];
    }

    const buckets = new Map<string, ManagedUser[]>();

    for (const user of filteredUsers) {
      const key =
        groupBy === "role"
          ? formatRole(user.role)
          : user.isActive
            ? "Active Users"
            : "Inactive Users";

      if (!buckets.has(key)) {
        buckets.set(key, []);
      }

      buckets.get(key)!.push(user);
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => {
        // Push "Student" group to the end
        const aIsStudent = a.toLowerCase() === "student";
        const bIsStudent = b.toLowerCase() === "student";
        if (aIsStudent && !bIsStudent) return 1;
        if (!aIsStudent && bIsStudent) return -1;
        return a.localeCompare(b);
      })
      .map(([label, grouped]) => ({
        label,
        users: grouped.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [filteredUsers, groupBy]);

  useEffect(() => {
    if (!filteredUsers.length) {
      setSelectedUserId(null);
      return;
    }

    setSelectedUserId((prev) => {
      if (prev && filteredUsers.some((user) => user.id === prev)) {
        return prev;
      }
      return filteredUsers[0].id;
    });
  }, [filteredUsers]);

  const selectedUser = useMemo(
    () => filteredUsers.find((user) => user.id === selectedUserId) ?? null,
    [filteredUsers, selectedUserId],
  );

  const selectedUserDraft = selectedUser ? editStateByUserId[selectedUser.id] : null;

  const editingUser = useMemo(
    () => users.find((user) => user.id === editingUserId) ?? null,
    [users, editingUserId],
  );

  const editingUserDraft = editingUser ? editStateByUserId[editingUser.id] : null;

  const toggleGroupCollapse = (label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const groupedLogs = useMemo(() => {
    const buckets = new Map<string, LogItem[]>();

    for (const log of logs) {
      const key = new Date(log.createdAt).toISOString().slice(0, 10);
      if (!buckets.has(key)) {
        buckets.set(key, []);
      }
      buckets.get(key)!.push(log);
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => (a > b ? -1 : 1))
      .map(([dateKey, dayLogs]) => ({
        dateKey,
        label: formatDayLabel(dayLogs[0].createdAt),
        logs: dayLogs,
      }));
  }, [logs]);

  const uniqueActors = useMemo(() => {
    const actorSet = new Set(
      logs
        .map((log) => log.actor?.email)
        .filter((email): email is string => Boolean(email)),
    );
    return actorSet.size;
  }, [logs]);

  async function handleCreateSeason(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingSeason(true);
    setError(null);

    try {
      await requestJson("/api/v1/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(seasonForm),
      });

      setSeasonForm({
        seasonType: "placement",
        academicYear: DEFAULT_ACADEMIC_YEAR,
        startDate: "",
        endDate: "",
        isActive: true,
      });
      await load(true);
    } catch (seasonError) {
      setError(seasonError instanceof Error ? seasonError.message : "Failed to create season");
    } finally {
      setCreatingSeason(false);
    }
  }

  async function handleDeleteSeason(seasonId: string) {
    if (!confirm("Are you sure you want to delete this season? This action cannot be undone.")) return;

    setDeletingSeasonId(seasonId);
    setError(null);

    try {
      await requestJson(`/api/v1/seasons/${seasonId}`, {
        method: "DELETE",
      });

      await load(true);
    } catch (seasonError) {
      setError(seasonError instanceof Error ? seasonError.message : "Failed to delete season");
    } finally {
      setDeletingSeasonId(null);
    }
  }

  async function handleToggleSeasonStatus(seasonId: string, currentStatus: boolean) {
    setUpdatingSeasonId(seasonId);
    setError(null);

    try {
      await requestJson(`/api/v1/seasons/${seasonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      await load(true);
    } catch (seasonError) {
      setError(seasonError instanceof Error ? seasonError.message : "Failed to update season status");
    } finally {
      setUpdatingSeasonId(null);
    }
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingUser(true);
    setError(null);

    try {
      if (!createUserForm.role) {
        throw new Error("No roles available. Add users in database first.");
      }

      await requestJson("/api/v1/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createUserForm,
          coordinatorType:
            createUserForm.role === usersMeta.coordinatorRole
              ? createUserForm.coordinatorType || undefined
              : undefined,
          password: createUserForm.password || undefined,
        }),
      });

      setCreateUserForm({
        name: "",
        email: "",
        phone: "",
        role: usersMeta.roles[0] ?? "",
        coordinatorType: usersMeta.coordinatorTypes[0] ?? "",
        isActive: true,
        password: "",
      });
      await load(true);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create user");
    } finally {
      setCreatingUser(false);
    }
  }

  async function handleSaveUser(userId: string) {
    const draft = editStateByUserId[userId];
    if (!draft) return;

    setSavingUserId(userId);
    setError(null);

    try {
      await requestJson(`/api/v1/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          phone: draft.phone || null,
          role: draft.role,
          coordinatorType:
            draft.role === usersMeta.coordinatorRole ? draft.coordinatorType || null : null,
          isActive: draft.isActive,
        }),
      });

      await requestJson(`/api/v1/admin/users/${userId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permissions: usersMeta.permissionKeys.map((key) => ({
            key,
            allowed: Boolean(draft.permissions[key]),
          })),
        }),
      });

      await load(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save user");
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleResetPassword(userId: string) {
    setSavingUserId(userId);
    setError(null);

    try {
      const payload = await requestJson<{ temporaryPassword: string }>(
        `/api/v1/admin/users/${userId}/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );

      setResetPasswordByUserId((prev) => ({
        ...prev,
        [userId]: payload.temporaryPassword,
      }));
    } catch (resetError) {
      setError(
        resetError instanceof Error ? resetError.message : "Failed to reset password",
      );
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleExport(type: "users" | "seasons") {
    setError(null);

    try {
      const response = await fetch(`/api/v1/admin/reports/export?type=${type}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const body = (await response.json()) as ApiEnvelope<unknown>;
        throw new Error(body.error?.message ?? "Failed to export report");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `nexus-${type}-report.csv`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Failed to export");
    }
  }

  async function handleBackup() {
    setError(null);

    try {
      const payload = await requestJson<unknown>("/api/v1/admin/backup");
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `nexus-admin-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch (backupError) {
      setError(backupError instanceof Error ? backupError.message : "Failed to create backup");
    }
  }

  const googleCreateUrl =
    process.env.NEXT_PUBLIC_ADMIN_GOOGLE_CALENDAR_CREATE_URL?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_CREATE_URL?.trim() ||
    "https://calendar.google.com/calendar/render?action=TEMPLATE";
  const activeSeasons = overview?.activeSeasons ?? [];

  if (loading) {
    return (
      <div className="px-6 py-12 flex flex-col items-center gap-3">
        <div className="shimmer h-8 w-64 rounded-xl" />
        <div className="shimmer h-4 w-48 rounded-lg" />
        <div className="mt-6 grid w-full max-w-4xl gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-slate-300 bg-white p-5"><div className="shimmer h-16 w-full rounded-lg" /></div>
          ))}
        </div>
      </div>
    );
  }

  const tabList = [
    { id: "schedule" as const, label: "Schedule", icon: CalendarDays },
    { id: "users" as const, label: "Users & Permissions", icon: Users },
    { id: "seasons" as const, label: "Seasons", icon: Calendar },
    { id: "logs" as const, label: "Logs", icon: AlertCircle },
    { id: "reports" as const, label: "Reports & Exports", icon: Download },
  ];

  return (
    <div className="-mt-6 xl:mt-0 space-y-5 px-4 pb-6 pt-6 animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Control Center</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage seasons, users, permissions, schedules, exports, and system logs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="btn btn-ghost"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error ? (
        <div className="mb-5 flex items-center gap-2 rounded-lg border-2 border-red-300 bg-red-50/60 px-4 py-3 text-sm font-medium text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {/* Tab Navigation */}
      <div className="mb-6 flex flex-wrap gap-1 border-b border-slate-200">
        {tabList.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${isActive ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SCHEDULE TAB */}
      {activeTab === "schedule" && (
      <div className="animate-fade-in">
        <section className="overflow-hidden rounded-lg border-2 border-slate-300 bg-slate-50">
          <div className="px-4 py-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Schedule Operations</h2>
              <p className="mt-0.5 text-xs text-slate-500">Centralized scheduling for placement activities.</p>
            </div>
            <Link href="/calender" className="btn btn-primary btn-sm">
              <CalendarDays className="h-3.5 w-3.5" />
              View Calendar
            </Link>
          </div>

          <div className="px-4 pb-4">
            <div className="rounded-lg border border-slate-300 bg-white px-4 py-4">
              <p className="text-sm text-slate-700">
                Create, review, and monitor events through Google Calendar with a consistent workflow for the admin team.
              </p>
              <a
                href={googleCreateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800 transition-colors hover:bg-blue-100"
              >
                <CalendarDays className="h-4 w-4" />
                Create Calendar Event
              </a>
            </div>
          </div>
        </section>
      </div>
      )}

      {/* USERS TAB */}
      {activeTab === "users" && (
      <div className="space-y-5 animate-fade-in">
        <form onSubmit={handleCreateUser} className="overflow-hidden rounded-lg border-2 border-slate-300 bg-slate-50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Add New User</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              required
              value={createUserForm.name}
              onChange={(event) =>
                setCreateUserForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Full name"
              className="input-base"
            />
            <input
              required
              type="email"
              value={createUserForm.email}
              onChange={(event) =>
                setCreateUserForm((prev) => ({ ...prev, email: event.target.value }))
              }
              placeholder="Email"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={createUserForm.phone}
              onChange={(event) =>
                setCreateUserForm((prev) => ({ ...prev, phone: event.target.value }))
              }
              placeholder="Phone (optional)"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="password"
              value={createUserForm.password}
              onChange={(event) =>
                setCreateUserForm((prev) => ({ ...prev, password: event.target.value }))
              }
              placeholder="Initial password (optional)"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={createUserForm.role}
              onChange={(event) =>
                setCreateUserForm((prev) => ({
                  ...prev,
                  role: event.target.value,
                }))
              }
              className="input-base"
            >
              {usersMeta.roles.length === 0 ? <option value="">No roles found</option> : null}
              {usersMeta.roles.map((role) => (
                <option key={role} value={role}>
                  {formatRole(role)}
                </option>
              ))}
            </select>
            <select
              value={createUserForm.coordinatorType}
              disabled={createUserForm.role !== usersMeta.coordinatorRole}
              onChange={(event) =>
                setCreateUserForm((prev) => ({
                  ...prev,
                  coordinatorType: event.target.value,
                }))
              }
              className="input-base disabled:opacity-50"
            >
              {usersMeta.coordinatorTypes.length === 0 ? (
                <option value="">No coordinator types found</option>
              ) : null}
              {usersMeta.coordinatorTypes.map((type) => (
                <option key={type} value={type}>
                  {formatRole(type)}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 md:col-span-2">
              <input
                type="checkbox"
                checked={createUserForm.isActive}
                onChange={(event) =>
                  setCreateUserForm((prev) => ({ ...prev, isActive: event.target.checked }))
                }
              />
              Create as active account
            </label>
          </div>
          <button
            type="submit"
            disabled={creatingUser}
            className="btn btn-primary mt-3"
          >
            <UserPlus className="h-4 w-4" />
            {creatingUser ? "Creating..." : "Add User"}
          </button>
        </form>

        <div className="overflow-hidden rounded-lg border-2 border-slate-300 bg-slate-50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">User Directory</h2>
          <p className="mb-4 text-sm text-slate-500">Browse users with filters and groups. Click the pencil to edit roles, permissions, or reset passwords.</p>
          <div className="mb-4 grid gap-3 rounded-lg border border-slate-300 bg-white p-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <div className="relative sm:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search by name, email, role" className="input-base pl-9" />
            </div>
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="input-base">
              <option value="all">All Roles</option>
              {usersMeta.roles.map((role) => (<option key={role} value={role}>{formatRole(role)}</option>))}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")} className="input-base">
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select value={groupBy} onChange={(event) => setGroupBy(event.target.value as "role" | "status" | "none")} className="input-base">
              <option value="role">Group by Role</option>
              <option value="status">Group by Status</option>
              <option value="none">No Group</option>
            </select>
          </div>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-300 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Visible</p>
              <p className="text-lg font-bold text-slate-900">{filteredUsers.length}</p>
            </div>
            <div className="rounded-lg border border-slate-300 bg-white px-4 py-3" style={{ borderLeft: "3px solid #10b981" }}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Active</p>
              <p className="text-lg font-bold text-emerald-600">{filteredUsers.filter((u) => u.isActive).length}</p>
            </div>
            <div className="rounded-lg border border-slate-300 bg-white px-4 py-3" style={{ borderLeft: "3px solid #ef4444" }}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Inactive</p>
              <p className="text-lg font-bold text-red-600">{filteredUsers.filter((u) => !u.isActive).length}</p>
            </div>
          </div>
          <div className="space-y-3">
            {groupedUsers.map((group) => {
              const isCollapsed = collapsedGroups.has(group.label);
              return (
                <div key={group.label} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                  <button type="button" onClick={() => toggleGroupCollapse(group.label)} className="flex w-full items-center justify-between bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">{group.label}</p>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700">{group.users.length}</span>
                    </div>
                    {isCollapsed ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
                  </button>
                  {!isCollapsed && (
                    <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
                      {group.users.map((user) => (
                        <div key={user.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:border-slate-300">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900">{user.name}</p>
                            <p className="truncate text-xs text-slate-500">{user.email}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px]">
                              {user.coordinatorType ? (<span className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-700">{formatRole(user.coordinatorType)}</span>) : null}
                              <span className={`rounded px-1.5 py-0.5 ${user.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{user.isActive ? "Active" : "Inactive"}</span>
                            </div>
                          </div>
                          <button type="button" onClick={() => setEditingUserId(user.id)} className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-400 transition-colors hover:border-slate-400 hover:text-slate-700" title="Edit user">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {filteredUsers.length === 0 ? (<p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-8 text-center text-sm text-slate-500">No users match your filters.</p>) : null}
          </div>
        </div>

        {/* Edit User Overlay */}
        {editingUser && editingUserDraft ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setEditingUserId(null)}>
            <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white shadow-xl animate-scale-up" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{editingUser.name}</h3>
                  <p className="text-xs text-slate-500">{editingUser.email} Â· Created {formatDateTime(editingUser.createdAt)}</p>
                </div>
                <button type="button" onClick={() => setEditingUserId(null)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-4 px-5 py-4">
                {resetPasswordByUserId[editingUser.id] ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Temporary password: <span className="font-semibold">{resetPasswordByUserId[editingUser.id]}</span></div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={editingUserDraft.name} onChange={(event) => setEditStateByUserId((prev) => ({ ...prev, [editingUser.id]: { ...editingUserDraft, name: event.target.value } }))} className="input-base" placeholder="Name" />
                  <input value={editingUserDraft.phone} onChange={(event) => setEditStateByUserId((prev) => ({ ...prev, [editingUser.id]: { ...editingUserDraft, phone: event.target.value } }))} placeholder="Phone" className="input-base" />
                  <select value={editingUserDraft.role} onChange={(event) => { const r = event.target.value; setEditStateByUserId((prev) => ({ ...prev, [editingUser.id]: { ...editingUserDraft, role: r, coordinatorType: r === usersMeta.coordinatorRole ? editingUserDraft.coordinatorType ?? usersMeta.coordinatorTypes[0] ?? null : null } })); }} className="input-base">
                    {usersMeta.roles.length === 0 ? <option value="">No roles found</option> : null}
                    {usersMeta.roles.map((role) => (<option key={role} value={role}>{formatRole(role)}</option>))}
                  </select>
                  <select value={editingUserDraft.coordinatorType ?? usersMeta.coordinatorTypes[0] ?? ""} disabled={editingUserDraft.role !== usersMeta.coordinatorRole} onChange={(event) => setEditStateByUserId((prev) => ({ ...prev, [editingUser.id]: { ...editingUserDraft, coordinatorType: event.target.value } }))} className="input-base disabled:opacity-50">
                    {usersMeta.coordinatorTypes.length === 0 ? (<option value="">No coordinator types</option>) : null}
                    {usersMeta.coordinatorTypes.map((type) => (<option key={type} value={type}>{formatRole(type)}</option>))}
                  </select>
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={editingUserDraft.isActive} onChange={(event) => setEditStateByUserId((prev) => ({ ...prev, [editingUser.id]: { ...editingUserDraft, isActive: event.target.checked } }))} />
                  Active account
                </label>
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Permissions</p>
                  {usersMeta.permissionKeys.length === 0 ? (<p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500">No permission keys found.</p>) : null}
                  <div className="flex flex-wrap gap-2">
                    {usersMeta.permissionKeys.map((pk) => (
                      <label key={pk} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700">
                        <input type="checkbox" checked={Boolean(editingUserDraft.permissions[pk])} onChange={(event) => setEditStateByUserId((prev) => ({ ...prev, [editingUser.id]: { ...editingUserDraft, permissions: { ...editingUserDraft.permissions, [pk]: event.target.checked } } }))} />
                        {formatRole(pk.replace("can_", "").replaceAll("_", " "))}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-[#E2E8F0] px-5 py-4">
                <button type="button" onClick={() => void handleResetPassword(editingUser.id)} disabled={savingUserId === editingUser.id} className="inline-flex items-center gap-1 rounded-md border border-amber-300 px-2.5 py-1.5 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-60"><KeyRound className="h-3.5 w-3.5" /> Reset Password</button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditingUserId(null)} className="rounded-lg px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100">Cancel</button>
                  <button type="button" onClick={() => { void handleSaveUser(editingUser.id); setEditingUserId(null); }} disabled={savingUserId === editingUser.id} className="btn btn-primary btn-sm"><Save className="h-3.5 w-3.5" /> Save</button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      )}

      {/* SEASONS TAB */}
      {activeTab === "seasons" && (
      <div className="space-y-5 animate-fade-in">
        <div className="overflow-hidden rounded-lg border-2 border-slate-300 bg-slate-50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Create New Season</h2>
          <p className="mb-4 text-sm text-slate-500">Add a new season (placement or internship) with start and end dates.</p>
          <form onSubmit={handleCreateSeason} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={seasonForm.academicYear}
                onChange={(event) =>
                  setSeasonForm((prev) => ({ ...prev, academicYear: event.target.value }))
                }
                className="input-base"
              >
                {ACADEMIC_YEAR_OPTIONS.map((yearOption) => (
                  <option key={yearOption} value={yearOption}>
                    {yearOption}
                  </option>
                ))}
              </select>
              <select
                value={seasonForm.seasonType}
                onChange={(event) =>
                  setSeasonForm((prev) => ({
                    ...prev,
                    seasonType: event.target.value as "placement" | "intern",
                  }))
                }
                className="input-base"
              >
                <option value="placement">Placement</option>
                <option value="intern">Internship</option>
              </select>
              <input
                type="date"
                value={seasonForm.startDate}
                onChange={(event) =>
                  setSeasonForm((prev) => ({ ...prev, startDate: event.target.value }))
                }
                className="input-base"
              />
              <input
                type="date"
                value={seasonForm.endDate}
                onChange={(event) =>
                  setSeasonForm((prev) => ({ ...prev, endDate: event.target.value }))
                }
                className="input-base"
              />
              <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={seasonForm.isActive}
                  onChange={(event) =>
                    setSeasonForm((prev) => ({ ...prev, isActive: event.target.checked }))
                  }
                />
                Active season
              </label>
            </div>
            <button
              type="submit"
              disabled={creatingSeason}
              className="btn btn-primary"
            >
              {creatingSeason ? "Creating..." : "Create Season"}
            </button>
          </form>
        </div>

        <div className="overflow-hidden rounded-lg border-2 border-slate-300 bg-slate-50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">All Seasons</h2>
          <p className="mb-4 text-sm text-slate-500">View and manage all recruitment seasons.</p>

          <div className="space-y-3">
            {allSeasons.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-8 text-center text-sm text-slate-500">
                No seasons found.
              </p>
            ) : (
              allSeasons.map((season) => (
                <div key={season.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-slate-300">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{season.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="capitalize">{season.seasonType}</span>
                      <span>·</span>
                      <span>{season.academicYear}</span>
                      {season.startDate && season.endDate ? (
                        <>
                          <span>·</span>
                          <span>
                            {new Date(season.startDate).toLocaleDateString()} - {new Date(season.endDate).toLocaleDateString()}
                          </span>
                        </>
                      ) : null}
                      <span className={`ml-2 rounded px-1.5 py-0.5 ${season.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                        {season.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleToggleSeasonStatus(season.id, season.isActive)}
                      disabled={updatingSeasonId === season.id}
                      className={`btn btn-sm shrink-0 ${season.isActive ? "btn-secondary" : "btn-primary"}`}
                      title={season.isActive ? "Deactivate season" : "Activate season"}
                    >
                      {season.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteSeason(season.id)}
                      disabled={deletingSeasonId === season.id}
                      className="shrink-0 rounded-lg border border-rose-200 p-2 text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      title="Delete season"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      )}

      {/* REPORTS TAB */}
      {activeTab === "reports" && (
      <div className="overflow-hidden rounded-lg border-2 border-slate-300 bg-slate-50 p-4 animate-fade-in">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Export Reports & Backup</h2>
        <p className="mb-4 text-sm text-slate-500">
          Export users and seasons as CSV. Generate a JSON backup snapshot.
        </p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => void handleExport("users")} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors">
            <Download className="h-4 w-4" /> Export Users
          </button>
          <button type="button" onClick={() => void handleExport("seasons")} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors">
            <Download className="h-4 w-4" /> Export Seasons
          </button>
          <button type="button" onClick={() => void handleBackup()} className="btn btn-primary">
            <Shield className="h-4 w-4" /> Generate Backup
          </button>
        </div>
      </div>
      )}

      {/* LOGS TAB */}
      {activeTab === "logs" && (
      <div className="overflow-hidden rounded-lg border-2 border-slate-300 bg-slate-50 p-4 animate-fade-in">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">System Audit Logs</h2>
            <p className="mt-0.5 text-sm text-slate-500">Grouped timeline of recent administrative actions.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">{logs.length} events</span>
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">{groupedLogs.length} days</span>
            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">{uniqueActors} actors</span>
          </div>
        </div>

        <div className="space-y-3">
          {groupedLogs.length ? (
            groupedLogs.map((group) => (
              <div key={group.dateKey} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{group.label}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{group.logs.length} event{group.logs.length === 1 ? "" : "s"}</span>
                </div>

                <div className="space-y-2">
                  {group.logs.map((log) => (
                    <div key={log.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${logActionTone(log.action)}`}>
                          {formatRole(log.action)}
                        </span>
                        <span className="text-xs text-slate-500">{formatDateTime(log.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        {log.actor ? `${log.actor.name} (${log.actor.email})` : "System"}
                      </p>
                      <p className="text-xs text-slate-400">
                        Target: {log.targetType ?? "n/a"} {log.targetId ?? ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <AlertCircle className="h-4 w-4" />
              No audit logs available.
            </div>
          )}
        </div>
      </div>
      )}

      {showActiveSeasonsWindow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Active Seasons</h3>
                <p className="text-xs text-slate-500">
                  {activeSeasons.length} active season{activeSeasons.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowActiveSeasonsWindow(false)}
                className="rounded-lg px-3 py-1.5 text-xs text-slate-700 transition-colors hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="max-h-[64vh] space-y-2 overflow-y-auto p-5">
              {activeSeasons.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-8 text-center text-sm text-slate-500">
                  No active seasons found.
                </p>
              ) : (
                activeSeasons.map((season) => (
                  <div key={season.id} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">{season.name}</p>
                    <p className="text-xs text-slate-500">
                      {formatRole(season.seasonType)} Â· {season.academicYear}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
