"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  Download,
  KeyRound,
  RefreshCw,
  Save,
  Search,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";

type OverviewResponse = {
  totals: {
    totalUsers: number;
    admins: number;
    coordinators: number;
    students: number;
    seasons: number;
    activeSeasons: number;
    schedules: number;
    customPermissionOverrides: number;
  };
  activeSeasons: Array<{
    id: string;
    name: string;
    seasonType: string;
    academicYear: string;
  }>;
  recentSchedules: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    status: string;
    company: {
      id: string;
      name: string;
    };
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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [groupBy, setGroupBy] = useState<"role" | "status" | "none">("role");
  const [showActiveSeasonsWindow, setShowActiveSeasonsWindow] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const [overviewPayload, usersPayload, logsPayload] = await Promise.all([
        requestJson<OverviewResponse>("/api/v1/admin/overview"),
        requestJson<AdminUsersPayload>("/api/v1/admin/users"),
        requestJson<LogItem[]>("/api/v1/admin/system/logs?limit=25"),
      ]);

      setOverview(overviewPayload);
      setUsersMeta(usersPayload.meta);
      setUsers(usersPayload.users);
      setLogs(logsPayload);
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
      .sort(([a], [b]) => a.localeCompare(b))
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

  async function handleExport(type: "users" | "seasons" | "schedules") {
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
      <div className="px-6 py-8 text-sm text-slate-600">Loading admin dashboard...</div>
    );
  }

  return (
    <div className="px-4 pb-8 pt-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Admin Control Center</h1>
          <p className="text-sm text-slate-600">
            Manage seasons, users, permissions, schedules, exports, and system logs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mb-5 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Total Users</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{overview?.totals.totalUsers ?? 0}</p>
          <p className="text-xs text-slate-500">
            Admin: {overview?.totals.admins ?? 0} • Coordinator: {overview?.totals.coordinators ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Seasons</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{overview?.totals.seasons ?? 0}</p>
          <p className="text-xs text-slate-500">Active now: {overview?.totals.activeSeasons ?? activeSeasons.length}</p>
          <button
            type="button"
            className="mt-1 inline-block text-xs text-blue-700 hover:text-blue-900"
            onClick={() => setShowActiveSeasonsWindow(true)}
          >
            Open active seasons window
          </button>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Schedules</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{overview?.totals.schedules ?? 0}</p>
          <a
            className="text-xs text-blue-700 hover:text-blue-900"
            href={googleCreateUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Create event in Google Calendar
          </a>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Permission Overrides</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {overview?.totals.customPermissionOverrides ?? 0}
          </p>
          <p className="text-xs text-slate-500">Per-user access levels configured</p>
        </div>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleCreateSeason} className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Create New Season</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={seasonForm.academicYear}
              onChange={(event) =>
                setSeasonForm((prev) => ({ ...prev, academicYear: event.target.value }))
              }
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="placement">Placement</option>
              <option value="intern">Intern</option>
            </select>
            <label className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={seasonForm.isActive}
                onChange={(event) =>
                  setSeasonForm((prev) => ({ ...prev, isActive: event.target.checked }))
                }
              />
              Active season
            </label>
            <input
              type="date"
              value={seasonForm.startDate}
              onChange={(event) =>
                setSeasonForm((prev) => ({ ...prev, startDate: event.target.value }))
              }
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={seasonForm.endDate}
              onChange={(event) =>
                setSeasonForm((prev) => ({ ...prev, endDate: event.target.value }))
              }
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={creatingSeason}
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
            {creatingSeason ? "Creating..." : "Create Season"}
          </button>
        </form>

        <form onSubmit={handleCreateUser} className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Manage User Accounts (Add)</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              required
              value={createUserForm.name}
              onChange={(event) =>
                setCreateUserForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Full name"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
              className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
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
            <label className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 md:col-span-2">
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
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" />
            {creatingUser ? "Creating..." : "Add User"}
          </button>
        </form>
      </div>

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Roles, Access Levels, and Password Reset</h2>
        <p className="mb-4 text-sm text-slate-600">
          Browse all people quickly with filters and groups, then edit one selected user on the right.
        </p>
        <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search by name, email, role"
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-8 pr-3 text-sm"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All Roles</option>
            {usersMeta.roles.map((role) => (
              <option key={role} value={role}>
                {formatRole(role)}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | "active" | "inactive")
            }
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={groupBy}
            onChange={(event) =>
              setGroupBy(event.target.value as "role" | "status" | "none")
            }
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="role">Group by Role</option>
            <option value="status">Group by Status</option>
            <option value="none">No Group</option>
          </select>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs text-slate-500">Visible Users</p>
            <p className="text-lg font-semibold text-slate-900">{filteredUsers.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs text-slate-500">Active</p>
            <p className="text-lg font-semibold text-emerald-700">
              {filteredUsers.filter((user) => user.isActive).length}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs text-slate-500">Inactive</p>
            <p className="text-lg font-semibold text-rose-700">
              {filteredUsers.filter((user) => !user.isActive).length}
            </p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
          <div className="rounded-lg border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <p className="text-sm font-medium text-slate-900">User Directory</p>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Users className="h-3.5 w-3.5" />
                Scroll to view all
              </span>
            </div>
            <div className="max-h-[34rem] space-y-3 overflow-y-auto p-3">
              {groupedUsers.map((group) => (
                <div key={group.label} className="rounded-md border border-slate-200 bg-slate-50 p-2">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</p>
                    <span className="text-xs text-slate-500">{group.users.length}</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.users.map((user) => {
                      const selected = user.id === selectedUserId;
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => setSelectedUserId(user.id)}
                          className={`rounded-md border px-3 py-2 text-left transition ${
                            selected
                              ? "border-blue-300 bg-blue-50"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <p className="text-sm font-medium text-slate-900">{user.name}</p>
                          <p className="truncate text-xs text-slate-600">{user.email}</p>
                          <div className="mt-1 flex items-center gap-2 text-[11px]">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
                              {formatRole(user.role)}
                            </span>
                            {user.coordinatorType ? (
                              <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-700">
                                {formatRole(user.coordinatorType)}
                              </span>
                            ) : null}
                            <span
                              className={`rounded px-1.5 py-0.5 ${
                                user.isActive
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-rose-100 text-rose-700"
                              }`}
                            >
                              {user.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-8 text-center text-sm text-slate-500">
                  No users match your filters.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            {!selectedUser || !selectedUserDraft ? (
              <p className="text-sm text-slate-500">Select a user from the directory to edit details.</p>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{selectedUser.name}</p>
                    <p className="text-xs text-slate-600">{selectedUser.email}</p>
                    <p className="text-xs text-slate-500">Created: {formatDateTime(selectedUser.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSaveUser(selectedUser.id)}
                      disabled={savingUserId === selectedUser.id}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleResetPassword(selectedUser.id)}
                      disabled={savingUserId === selectedUser.id}
                      className="inline-flex items-center gap-1 rounded-md border border-amber-300 px-2.5 py-1.5 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Reset Password
                    </button>
                  </div>
                </div>

                {resetPasswordByUserId[selectedUser.id] ? (
                  <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Temporary password: <span className="font-semibold">{resetPasswordByUserId[selectedUser.id]}</span>
                  </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={selectedUserDraft.name}
                    onChange={(event) =>
                      setEditStateByUserId((prev) => ({
                        ...prev,
                        [selectedUser.id]: { ...selectedUserDraft, name: event.target.value },
                      }))
                    }
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={selectedUserDraft.phone}
                    onChange={(event) =>
                      setEditStateByUserId((prev) => ({
                        ...prev,
                        [selectedUser.id]: { ...selectedUserDraft, phone: event.target.value },
                      }))
                    }
                    placeholder="Phone"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <select
                    value={selectedUserDraft.role}
                    onChange={(event) => {
                      const nextRole = event.target.value;
                      setEditStateByUserId((prev) => ({
                        ...prev,
                        [selectedUser.id]: {
                          ...selectedUserDraft,
                          role: nextRole,
                          coordinatorType:
                            nextRole === usersMeta.coordinatorRole
                              ? selectedUserDraft.coordinatorType ?? usersMeta.coordinatorTypes[0] ?? null
                              : null,
                        },
                      }));
                    }}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                      {usersMeta.roles.length === 0 ? <option value="">No roles found</option> : null}
                    {usersMeta.roles.map((role) => (
                      <option key={role} value={role}>
                        {formatRole(role)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedUserDraft.coordinatorType ?? usersMeta.coordinatorTypes[0] ?? ""}
                    disabled={selectedUserDraft.role !== usersMeta.coordinatorRole}
                    onChange={(event) =>
                      setEditStateByUserId((prev) => ({
                        ...prev,
                        [selectedUser.id]: {
                          ...selectedUserDraft,
                          coordinatorType: event.target.value,
                        },
                      }))
                    }
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
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
                </div>

                <label className="mt-3 inline-flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedUserDraft.isActive}
                    onChange={(event) =>
                      setEditStateByUserId((prev) => ({
                        ...prev,
                        [selectedUser.id]: { ...selectedUserDraft, isActive: event.target.checked },
                      }))
                    }
                  />
                  Active account
                </label>

                <div className="mt-3 grid gap-2">
                  {usersMeta.permissionKeys.length === 0 ? (
                    <p className="rounded-md border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500">
                      No permission keys found in database yet.
                    </p>
                  ) : null}
                  {usersMeta.permissionKeys.map((permissionKey) => (
                    <label
                      key={permissionKey}
                      className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(selectedUserDraft.permissions[permissionKey])}
                        onChange={(event) =>
                          setEditStateByUserId((prev) => ({
                            ...prev,
                            [selectedUser.id]: {
                              ...selectedUserDraft,
                              permissions: {
                                ...selectedUserDraft.permissions,
                                [permissionKey]: event.target.checked,
                              },
                            },
                          }))
                        }
                      />
                      {formatRole(permissionKey.replace("can_", "").replaceAll("_", " "))}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Export Reports and Backup</h2>
          <p className="mb-3 text-sm text-slate-600">
            Export users, seasons, and schedules as CSV. Generate JSON backup snapshot for critical entities.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleExport("users")}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <Download className="h-4 w-4" />
              Export Users
            </button>
            <button
              type="button"
              onClick={() => void handleExport("seasons")}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <Download className="h-4 w-4" />
              Export Seasons
            </button>
            <button
              type="button"
              onClick={() => void handleExport("schedules")}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <Download className="h-4 w-4" />
              Export Schedules
            </button>
            <button
              type="button"
              onClick={() => void handleBackup()}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              <Shield className="h-4 w-4" />
              Generate Backup
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Schedules and Timeline</h2>
          <p className="mb-3 text-sm text-slate-600">
            Latest schedule entries and quick jump to full schedule management.
          </p>
          <div className="space-y-2">
            {overview?.recentSchedules.length ? (
              overview.recentSchedules.map((schedule) => (
                <div key={schedule.id} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <p className="font-medium text-slate-900">{schedule.title}</p>
                  <p className="text-xs text-slate-600">{schedule.company.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(schedule.startTime)} - {formatDateTime(schedule.endTime)} ({schedule.status})
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No schedules found.</p>
            )}
          </div>
          <Link
            href="/calender"
            className="mt-3 inline-flex items-center gap-2 rounded-md border border-blue-300 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
          >
            View Admin Calendar
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">System Logs</h2>
            <p className="text-sm text-slate-600">Grouped timeline of recent administrative actions.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{logs.length} events</span>
            <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">{groupedLogs.length} day groups</span>
            <span className="rounded-full bg-violet-100 px-2 py-1 text-violet-700">{uniqueActors} actors</span>
          </div>
        </div>

        <div className="max-h-[30rem] space-y-3 overflow-y-auto pr-1">
          {groupedLogs.length ? (
            groupedLogs.map((group) => (
              <div key={group.dateKey} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</p>
                  <span className="text-xs text-slate-500">{group.logs.length} event{group.logs.length === 1 ? "" : "s"}</span>
                </div>

                <div className="space-y-2">
                  {group.logs.map((log) => (
                    <div key={log.id} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${logActionTone(log.action)}`}>
                          {formatRole(log.action)}
                        </span>
                        <span className="text-xs text-slate-500">{formatDateTime(log.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        {log.actor ? `${log.actor.name} (${log.actor.email})` : "System"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Target: {log.targetType ?? "n/a"} {log.targetId ?? ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="inline-flex items-center gap-2 text-sm text-slate-500">
              <AlertCircle className="h-4 w-4" />
              No audit logs available.
            </div>
          )}
        </div>
      </div>

      {showActiveSeasonsWindow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Active Seasons</h3>
                <p className="text-xs text-slate-500">
                  {activeSeasons.length} active season{activeSeasons.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowActiveSeasonsWindow(false)}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="max-h-[64vh] space-y-2 overflow-y-auto p-4">
              {activeSeasons.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500">
                  No active seasons found.
                </p>
              ) : (
                activeSeasons.map((season) => (
                  <div key={season.id} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-sm font-medium text-slate-900">{season.name}</p>
                    <p className="text-xs text-slate-600">
                      {formatRole(season.seasonType)} • {season.academicYear}
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
