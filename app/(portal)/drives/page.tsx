"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  BarChart3,
  Briefcase,
  Building2,
  CalendarRange,
  ChevronRight,
  Download,
  Filter,
  RefreshCcw,
  SearchX,
  TriangleAlert,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Badge from "../../../components/ui/Badge";
import EmptyState from "../../../components/ui/EmptyState";
import FilterSelect from "../../../components/ui/FilterSelect";
import Modal from "../../../components/ui/Modal";
import SearchBar from "../../../components/ui/SearchBar";
import StatusBadge from "../../../components/ui/StatusBadge";
import DrivesLoadingView from "./DrivesLoadingView";

type SeasonType = "intern" | "placement";
type CycleStatus =
  | "not_contacted"
  | "contacted"
  | "positive"
  | "accepted"
  | "rejected";
type DriveStatus = "tentative" | "confirmed" | "completed" | "cancelled";
type DriveStage = "oa" | "interview" | "hr" | "final" | "other";

type CompareScope = "global" | "company";
type KpiFilterKey =
  | "all"
  | "status:not_contacted"
  | "status:contacted"
  | "status:positive"
  | "status:accepted"
  | "status:rejected"
  | "drives:total"
  | "drives:confirmed"
  | "drives:completed"
  | "drives:conflict";

type ApiMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
};

type ApiResponse<T> = {
  data?: T;
  meta?: ApiMeta;
  error?: {
    message?: string;
    code?: string;
  };
};

type SeasonRecord = {
  id: string;
  name: string;
  seasonType: SeasonType;
  academicYear: string;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
};

type CompanyRecord = {
  id: string;
  name: string;
  industry: string | null;
  contactsCount?: number | null;
};

type CycleRecord = {
  id: string;
  companyId: string;
  seasonId: string;
  status: CycleStatus;
  nextFollowUpAt: string | null;
  updatedAt: string;
};

type DriveRecord = {
  id: string;
  companyId: string;
  companySeasonCycleId: string;
  title: string;
  stage: DriveStage;
  status: DriveStatus;
  venue: string | null;
  startAt: string | null;
  endAt: string | null;
  isConflictFlagged: boolean | null;
  updatedAt: string;
  company: {
    id: string;
    name: string;
    industry: string | null;
  };
};

type BlogRecord = {
  id: string;
  title: string;
  createdAt: string;
  moderationStatus?: "pending" | "approved" | "rejected";
  company: {
    id: string;
    name: string;
  };
};

type MePayload = {
  user: {
    role: string;
    coordinatorType?: string | null;
  };
};

type CompanyRow = {
  cycleId: string;
  companyId: string;
  companyName: string;
  industry: string;
  status: CycleStatus;
  contactsCount: number;
  totalDrives: number;
  confirmedDrives: number;
  completedDrives: number;
  conflictDrives: number;
  lastActivity: string | null;
  nextFollowUpAt: string | null;
  blogCount: number;
  latestBlogTitle: string | null;
  drives: DriveRecord[];
};

type SeasonSummary = {
  companies: number;
  statusCounts: Record<CycleStatus, number>;
  totalDrives: number;
  confirmedDrives: number;
  completedDrives: number;
  conflictDrives: number;
  companyMetrics: Record<
    string,
    {
      status: CycleStatus;
      totalDrives: number;
      confirmedDrives: number;
      completedDrives: number;
      conflictDrives: number;
    }
  >;
};

const STATUS_OPTIONS = [
  { value: "not_contacted", label: "Not Contacted" },
  { value: "contacted", label: "Contacted" },
  { value: "positive", label: "Positive" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];

const STAGE_OPTIONS = [
  { value: "oa", label: "OA" },
  { value: "interview", label: "Interview" },
  { value: "hr", label: "HR" },
  { value: "final", label: "Final" },
  { value: "other", label: "Other" },
];

const STATUS_COLORS: Record<CycleStatus, string> = {
  not_contacted: "#94A3B8",
  contacted: "#60A5FA",
  positive: "#3B82F6",
  accepted: "#2563EB",
  rejected: "#93C5FD",
};

const STAGE_COLORS: Record<DriveStage, string> = {
  oa: "#2563EB",
  interview: "#3B82F6",
  hr: "#60A5FA",
  final: "#1D4ED8",
  other: "#93C5FD",
};

const DRIVE_STATUS_ORDER: DriveStatus[] = [
  "tentative",
  "confirmed",
  "completed",
  "cancelled",
];

function emptyStatusCounts(): Record<CycleStatus, number> {
  return {
    not_contacted: 0,
    contacted: 0,
    positive: 0,
    accepted: 0,
    rejected: 0,
  };
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getComparableDate(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function toMonthBucket(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  });
}

function matchesDateRange(
  value: string | null,
  fromDate: string,
  toDate: string,
): boolean {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
  const to = toDate ? new Date(`${toDate}T23:59:59`) : null;

  if (from && date < from) {
    return false;
  }
  if (to && date > to) {
    return false;
  }
  return true;
}

async function requestJson<T>(
  url: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });

  const raw = await response.text();
  let payload: ApiResponse<T> = {};

  if (raw) {
    try {
      payload = JSON.parse(raw) as ApiResponse<T>;
    } catch {
      payload = {};
    }
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error(payload.error?.message ?? "Request failed");
  }

  return payload;
}

async function fetchAllCompanies(): Promise<CompanyRecord[]> {
  const aggregated: CompanyRecord[] = [];
  let page = 1;
  const limit = 100;

  while (true) {
    const payload = await requestJson<CompanyRecord[]>(
      `/api/v1/companies?page=${page}&limit=${limit}`,
    );

    aggregated.push(...(payload.data ?? []));

    const totalPages = payload.meta?.totalPages ?? 1;
    if (page >= totalPages) {
      break;
    }
    page += 1;
  }

  return aggregated;
}

async function fetchAllCycles(seasonId: string): Promise<CycleRecord[]> {
  const aggregated: CycleRecord[] = [];
  let page = 1;
  const limit = 100;

  while (true) {
    const payload = await requestJson<CycleRecord[]>(
      `/api/v1/company-season-cycles?seasonId=${encodeURIComponent(seasonId)}&page=${page}&limit=${limit}`,
    );

    aggregated.push(...(payload.data ?? []));

    const totalPages = payload.meta?.totalPages ?? 1;
    if (page >= totalPages) {
      break;
    }
    page += 1;
  }

  return aggregated;
}

async function fetchSeasonDrives(seasonId: string): Promise<DriveRecord[]> {
  const payload = await requestJson<DriveRecord[]>(
    `/api/v1/drives?seasonId=${encodeURIComponent(seasonId)}`,
  );
  return payload.data ?? [];
}

function buildRows(
  cycles: CycleRecord[],
  drives: DriveRecord[],
  companyById: Map<string, CompanyRecord>,
  blogSummaryByCompany: Map<
    string,
    { count: number; latestTitle: string | null }
  >,
): CompanyRow[] {
  const drivesByCycle = new Map<string, DriveRecord[]>();

  for (const drive of drives) {
    const list = drivesByCycle.get(drive.companySeasonCycleId) ?? [];
    list.push(drive);
    drivesByCycle.set(drive.companySeasonCycleId, list);
  }

  return cycles
    .map((cycle) => {
      const cycleDrives = (drivesByCycle.get(cycle.id) ?? []).slice();
      cycleDrives.sort(
        (left, right) =>
          getComparableDate(right.startAt ?? right.updatedAt) -
          getComparableDate(left.startAt ?? left.updatedAt),
      );

      const company = companyById.get(cycle.companyId);
      const firstDriveCompany = cycleDrives[0]?.company;
      const companyName =
        company?.name ?? firstDriveCompany?.name ?? "Unknown Company";
      const industry =
        company?.industry ?? firstDriveCompany?.industry ?? "General";
      const contactsCount = company?.contactsCount ?? 0;

      const lastDriveActivity = cycleDrives.reduce<number>((latest, drive) => {
        const stamp = getComparableDate(drive.startAt ?? drive.updatedAt);
        return stamp > latest ? stamp : latest;
      }, 0);

      const cycleActivity = getComparableDate(cycle.updatedAt);
      const activityStamp = Math.max(lastDriveActivity, cycleActivity);

      const confirmedDrives = cycleDrives.filter(
        (drive) => drive.status === "confirmed",
      ).length;
      const completedDrives = cycleDrives.filter(
        (drive) => drive.status === "completed",
      ).length;
      const conflictDrives = cycleDrives.filter(
        (drive) => drive.isConflictFlagged,
      ).length;
      const blogSummary = blogSummaryByCompany.get(cycle.companyId);

      return {
        cycleId: cycle.id,
        companyId: cycle.companyId,
        companyName,
        industry,
        status: cycle.status,
        contactsCount,
        totalDrives: cycleDrives.length,
        confirmedDrives,
        completedDrives,
        conflictDrives,
        lastActivity:
          activityStamp > 0 ? new Date(activityStamp).toISOString() : null,
        nextFollowUpAt: cycle.nextFollowUpAt,
        blogCount: blogSummary?.count ?? 0,
        latestBlogTitle: blogSummary?.latestTitle ?? null,
        drives: cycleDrives,
      };
    })
    .sort(
      (left, right) =>
        getComparableDate(right.lastActivity) -
        getComparableDate(left.lastActivity),
    );
}

function buildSeasonSummary(rows: CompanyRow[]): SeasonSummary {
  const summary: SeasonSummary = {
    companies: rows.length,
    statusCounts: emptyStatusCounts(),
    totalDrives: 0,
    confirmedDrives: 0,
    completedDrives: 0,
    conflictDrives: 0,
    companyMetrics: {},
  };

  for (const row of rows) {
    summary.statusCounts[row.status] += 1;
    summary.totalDrives += row.totalDrives;
    summary.confirmedDrives += row.confirmedDrives;
    summary.completedDrives += row.completedDrives;
    summary.conflictDrives += row.conflictDrives;
    summary.companyMetrics[row.companyId] = {
      status: row.status,
      totalDrives: row.totalDrives,
      confirmedDrives: row.confirmedDrives,
      completedDrives: row.completedDrives,
      conflictDrives: row.conflictDrives,
    };
  }

  return summary;
}

function DetailPanel({ row }: { row: CompanyRow }) {
  const drivesByStatus = DRIVE_STATUS_ORDER.map((status) => ({
    status,
    value: row.drives.filter((drive) => drive.status === status).length,
  }));

  return (
    <div className="card p-4 lg:p-5 space-y-4">
      <div className="space-y-2">
        <p className="text-lg font-semibold text-slate-900 wrap-break-word">
          {row.companyName}
        </p>
        <div className="flex items-center gap-2">
          <StatusBadge status={row.status} />
          <Badge variant="info" size="sm">
            {row.industry}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
          <p className="text-xs text-slate-500">Total drives</p>
          <p className="text-xl font-semibold text-slate-900">
            {row.totalDrives}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
          <p className="text-xs text-slate-500">Completed</p>
          <p className="text-xl font-semibold text-slate-900">
            {row.completedDrives}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
          <p className="text-xs text-slate-500">Contacts</p>
          <p className="text-xl font-semibold text-slate-900">
            {row.contactsCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
          <p className="text-xs text-slate-500">Conflict flagged</p>
          <p className="text-xl font-semibold text-slate-900">
            {row.conflictDrives}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Timeline
        </p>
        <div className="rounded-xl border border-slate-100 bg-white p-3 space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-500">Last activity</span>
            <span className="font-medium text-slate-800">
              {formatDateTime(row.lastActivity)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-500">Next follow-up</span>
            <span className="font-medium text-slate-800">
              {formatDateTime(row.nextFollowUpAt)}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Drive status split
        </p>
        <div className="space-y-2">
          {drivesByStatus.map((item) => (
            <div
              key={item.status}
              className="rounded-xl border border-slate-100 bg-white px-3 py-2 flex items-center justify-between gap-3"
            >
              <StatusBadge status={item.status} size="sm" />
              <span className="text-sm font-semibold text-slate-800">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Recent drives
        </p>
        <div className="space-y-2 max-h-56 overflow-auto pr-1">
          {row.drives.slice(0, 5).map((drive) => (
            <div
              key={drive.id}
              className="rounded-xl border border-slate-100 bg-white px-3 py-2"
            >
              <p className="text-sm font-medium text-slate-900 wrap-break-word">
                {drive.title}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {formatDateTime(drive.startAt)}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="gray" size="sm">
                  {(drive.stage ?? "other").toUpperCase()}
                </Badge>
                <StatusBadge status={drive.status} size="sm" />
              </div>
            </div>
          ))}

          {row.drives.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-500 text-center">
              No drives have been added for this company in the selected season.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-white px-3 py-3">
        <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
          Blog linkage
        </p>
        <p className="text-sm text-slate-800">
          Approved/public blogs:{" "}
          <span className="font-semibold">{row.blogCount}</span>
        </p>
        <p className="text-xs text-slate-500 mt-1 truncate">
          Latest: {row.latestBlogTitle ?? "No linked blog yet"}
        </p>
      </div>
    </div>
  );
}

function percentageDelta(base: number, current: number) {
  if (base === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - base) / base) * 100;
}

function asSigned(value: number) {
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(1));
  if (rounded > 0) {
    return `+${rounded}`;
  }
  return String(rounded);
}

export default function DrivesPage() {
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isSeasonLoading, setIsSeasonLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [seasons, setSeasons] = useState<SeasonRecord[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");

  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [cycles, setCycles] = useState<CycleRecord[]>([]);
  const [drives, setDrives] = useState<DriveRecord[]>([]);
  const [blogs, setBlogs] = useState<BlogRecord[]>([]);

  const [currentUserRole, setCurrentUserRole] = useState<string>("student");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [stageFilter, setStageFilter] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activeKpiFilter, setActiveKpiFilter] = useState<KpiFilterKey>("all");

  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareScope, setCompareScope] = useState<CompareScope>("global");
  const [compareSeasonId, setCompareSeasonId] = useState("");
  const [compareCompanyId, setCompareCompanyId] = useState("");
  const [isCompareLoading, setIsCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [compareSummary, setCompareSummary] = useState<SeasonSummary | null>(
    null,
  );

  const canExport =
    currentUserRole === "tpo_admin" || currentUserRole === "coordinator";

  const selectedSeason = useMemo(
    () => seasons.find((season) => season.id === selectedSeasonId) ?? null,
    [seasons, selectedSeasonId],
  );

  const seasonOptions = useMemo(
    () =>
      seasons.map((season) => ({
        value: season.id,
        label: `${season.name} (${season.academicYear})`,
      })),
    [seasons],
  );

  const companyById = useMemo(
    () => new Map(companies.map((company) => [company.id, company])),
    [companies],
  );

  const blogSummaryByCompany = useMemo(() => {
    const summary = new Map<
      string,
      { count: number; latestTitle: string | null }
    >();

    const approvedBlogs = blogs.filter(
      (blog) => !blog.moderationStatus || blog.moderationStatus === "approved",
    );

    const grouped = new Map<string, BlogRecord[]>();
    for (const blog of approvedBlogs) {
      const list = grouped.get(blog.company.id) ?? [];
      list.push(blog);
      grouped.set(blog.company.id, list);
    }

    for (const [companyId, list] of grouped.entries()) {
      const sorted = list.sort(
        (left, right) =>
          getComparableDate(right.createdAt) -
          getComparableDate(left.createdAt),
      );
      summary.set(companyId, {
        count: list.length,
        latestTitle: sorted[0]?.title ?? null,
      });
    }

    return summary;
  }, [blogs]);

  const allRows = useMemo(
    () => buildRows(cycles, drives, companyById, blogSummaryByCompany),
    [cycles, drives, companyById, blogSummaryByCompany],
  );

  const fullSummary = useMemo(() => buildSeasonSummary(allRows), [allRows]);

  const rowsAfterToolbarFilters = useMemo(() => {
    const searchText = query.trim().toLowerCase();

    return allRows.filter((row) => {
      if (statusFilter.length > 0 && !statusFilter.includes(row.status)) {
        return false;
      }

      if (searchText) {
        const matchesSearch =
          row.companyName.toLowerCase().includes(searchText) ||
          row.industry.toLowerCase().includes(searchText) ||
          row.drives.some((drive) =>
            drive.title.toLowerCase().includes(searchText),
          );

        if (!matchesSearch) {
          return false;
        }
      }

      if (stageFilter.length > 0 || fromDate || toDate) {
        const hasMatch = row.drives.some((drive) => {
          if (stageFilter.length > 0 && !stageFilter.includes(drive.stage)) {
            return false;
          }

          if (fromDate || toDate) {
            const driveAnchorDate = drive.startAt ?? drive.updatedAt;
            if (!matchesDateRange(driveAnchorDate, fromDate, toDate)) {
              return false;
            }
          }

          return true;
        });

        if (!hasMatch) {
          return false;
        }
      }

      return true;
    });
  }, [allRows, query, statusFilter, stageFilter, fromDate, toDate]);

  const toolbarSummary = useMemo(
    () => buildSeasonSummary(rowsAfterToolbarFilters),
    [rowsAfterToolbarFilters],
  );

  const rows = useMemo(() => {
    return rowsAfterToolbarFilters.filter((row) => {
      switch (activeKpiFilter) {
        case "all":
          return true;
        case "status:not_contacted":
          return row.status === "not_contacted";
        case "status:contacted":
          return row.status === "contacted";
        case "status:positive":
          return row.status === "positive";
        case "status:accepted":
          return row.status === "accepted";
        case "status:rejected":
          return row.status === "rejected";
        case "drives:total":
          return row.totalDrives > 0;
        case "drives:confirmed":
          return row.confirmedDrives > 0;
        case "drives:completed":
          return row.completedDrives > 0;
        case "drives:conflict":
          return row.conflictDrives > 0;
        default:
          return true;
      }
    });
  }, [rowsAfterToolbarFilters, activeKpiFilter]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.companyId === selectedCompanyId) ?? null,
    [rows, selectedCompanyId],
  );

  const lineData = useMemo(() => {
    const bucketMap = new Map<string, number>();

    for (const row of rows) {
      for (const drive of row.drives) {
        const anchor = drive.startAt ?? drive.updatedAt;
        if (!anchor) {
          continue;
        }
        const bucket = toMonthBucket(anchor);
        bucketMap.set(bucket, (bucketMap.get(bucket) ?? 0) + 1);
      }
    }

    return Array.from(bucketMap.entries())
      .map(([period, count]) => ({ period, count }))
      .sort((left, right) => {
        const leftStamp = new Date(`01 ${left.period}`).getTime();
        const rightStamp = new Date(`01 ${right.period}`).getTime();
        return leftStamp - rightStamp;
      });
  }, [rows]);

  const stageData = useMemo(() => {
    const counts: Record<DriveStage, number> = {
      oa: 0,
      interview: 0,
      hr: 0,
      final: 0,
      other: 0,
    };

    for (const row of rows) {
      for (const drive of row.drives) {
        const stage = drive.stage in counts ? drive.stage : "other";
        counts[stage] += 1;
      }
    }

    return STAGE_OPTIONS.map((option) => ({
      name: option.label,
      value: counts[option.value as DriveStage],
      color: STAGE_COLORS[option.value as DriveStage],
    }));
  }, [rows]);

  useEffect(() => {
    let active = true;

    async function boot() {
      setIsBootLoading(true);
      setErrorMessage(null);

      try {
        const [seasonPayload, companyRows, blogsPayload, mePayload] =
          await Promise.all([
            requestJson<SeasonRecord[]>("/api/v1/seasons"),
            fetchAllCompanies(),
            requestJson<BlogRecord[]>("/api/v1/blogs?limit=100"),
            requestJson<MePayload>("/api/v1/auth/me"),
          ]);

        if (!active) {
          return;
        }

        const seasonList = seasonPayload.data ?? [];
        setSeasons(seasonList);
        setCompanies(companyRows);
        setBlogs(blogsPayload.data ?? []);
        setCurrentUserRole(mePayload.data?.user.role ?? "student");

        const defaultSeason =
          seasonList.find((season) => season.isActive)?.id ??
          seasonList[0]?.id ??
          "";
        setSelectedSeasonId(defaultSeason);
      } catch (error) {
        if (!active) {
          return;
        }
        console.error("Failed to initialize drives page:", error);
        setErrorMessage(
          "Unable to load dashboard data right now. Please retry.",
        );
      } finally {
        if (active) {
          setIsBootLoading(false);
        }
      }
    }

    void boot();

    return () => {
      active = false;
    };
  }, []);

  async function loadSeasonData(seasonId: string, refreshing = false) {
    if (!seasonId) {
      setCycles([]);
      setDrives([]);
      return;
    }

    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsSeasonLoading(true);
    }

    setErrorMessage(null);

    try {
      const [cycleRows, driveRows] = await Promise.all([
        fetchAllCycles(seasonId),
        fetchSeasonDrives(seasonId),
      ]);

      setCycles(cycleRows);
      setDrives(driveRows);
    } catch (error) {
      console.error("Failed to load season data:", error);
      setErrorMessage("Unable to refresh season analytics. Please try again.");
    } finally {
      if (refreshing) {
        setIsRefreshing(false);
      } else {
        setIsSeasonLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadSeasonData(selectedSeasonId);
  }, [selectedSeasonId]);

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedCompanyId("");
      return;
    }

    const exists = rows.some((row) => row.companyId === selectedCompanyId);
    if (!exists) {
      setSelectedCompanyId(rows[0].companyId);
    }
  }, [rows, selectedCompanyId]);

  useEffect(() => {
    if (rows.length > 0 && !compareCompanyId) {
      setCompareCompanyId(rows[0].companyId);
    }
  }, [rows, compareCompanyId]);

  useEffect(() => {
    if (seasons.length === 0 || !selectedSeasonId) {
      setCompareSeasonId("");
      return;
    }

    if (compareSeasonId && compareSeasonId !== selectedSeasonId) {
      return;
    }

    const fallback =
      seasons.find((season) => season.id !== selectedSeasonId)?.id ?? "";
    setCompareSeasonId(fallback);
  }, [seasons, selectedSeasonId, compareSeasonId]);

  useEffect(() => {
    let active = true;

    async function loadCompareSummary() {
      if (
        !isCompareOpen ||
        !compareSeasonId ||
        compareSeasonId === selectedSeasonId
      ) {
        setCompareSummary(null);
        return;
      }

      setIsCompareLoading(true);
      setCompareError(null);

      try {
        const [cycleRows, driveRows] = await Promise.all([
          fetchAllCycles(compareSeasonId),
          fetchSeasonDrives(compareSeasonId),
        ]);

        if (!active) {
          return;
        }

        const compareRows = buildRows(
          cycleRows,
          driveRows,
          companyById,
          blogSummaryByCompany,
        );
        setCompareSummary(buildSeasonSummary(compareRows));
      } catch (error) {
        if (!active) {
          return;
        }
        console.error("Failed to load compare summary:", error);
        setCompareError("Unable to load comparison season.");
      } finally {
        if (active) {
          setIsCompareLoading(false);
        }
      }
    }

    void loadCompareSummary();

    return () => {
      active = false;
    };
  }, [
    isCompareOpen,
    compareSeasonId,
    selectedSeasonId,
    companyById,
    blogSummaryByCompany,
  ]);

  function clearFilters() {
    setQuery("");
    setStatusFilter([]);
    setStageFilter([]);
    setFromDate("");
    setToDate("");
    setActiveKpiFilter("all");
  }

  function exportCsv() {
    if (!canExport || rows.length === 0) {
      return;
    }

    const lines = [
      [
        "Company",
        "Industry",
        "Status",
        "Total Drives",
        "Confirmed",
        "Completed",
        "Conflict Flagged",
        "Contacts",
        "Last Activity",
      ],
      ...rows.map((row) => [
        row.companyName,
        row.industry,
        row.status,
        String(row.totalDrives),
        String(row.confirmedDrives),
        String(row.completedDrives),
        String(row.conflictDrives),
        String(row.contactsCount),
        formatDateTime(row.lastActivity),
      ]),
    ]
      .map((columns) =>
        columns.map((column) => `"${column.replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");

    const seasonLabel = selectedSeason?.name?.replace(/\s+/g, "-") ?? "season";
    const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
    const href = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `drives-${seasonLabel}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
  }

  const compareBaselineSeason = seasons.find(
    (season) => season.id === compareSeasonId,
  );

  const globalCurrentMetrics = {
    companies: fullSummary.companies,
    totalDrives: fullSummary.totalDrives,
    confirmedDrives: fullSummary.confirmedDrives,
    completedDrives: fullSummary.completedDrives,
    conflictDrives: fullSummary.conflictDrives,
  };

  const globalPreviousMetrics = {
    companies: compareSummary?.companies ?? 0,
    totalDrives: compareSummary?.totalDrives ?? 0,
    confirmedDrives: compareSummary?.confirmedDrives ?? 0,
    completedDrives: compareSummary?.completedDrives ?? 0,
    conflictDrives: compareSummary?.conflictDrives ?? 0,
  };

  const emptyCompanyMetric = {
    status: "not_contacted" as CycleStatus,
    totalDrives: 0,
    confirmedDrives: 0,
    completedDrives: 0,
    conflictDrives: 0,
  };

  const companyCurrentMetrics =
    fullSummary.companyMetrics[compareCompanyId] ?? emptyCompanyMetric;
  const companyPreviousMetrics =
    compareSummary?.companyMetrics[compareCompanyId] ?? emptyCompanyMetric;

  const compareCards = [
    {
      label: compareScope === "global" ? "Companies" : "Drive count",
      current:
        compareScope === "global"
          ? globalCurrentMetrics.companies
          : companyCurrentMetrics.totalDrives,
      previous:
        compareScope === "global"
          ? globalPreviousMetrics.companies
          : companyPreviousMetrics.totalDrives,
    },
    {
      label: "Confirmed drives",
      current:
        compareScope === "global"
          ? globalCurrentMetrics.confirmedDrives
          : companyCurrentMetrics.confirmedDrives,
      previous:
        compareScope === "global"
          ? globalPreviousMetrics.confirmedDrives
          : companyPreviousMetrics.confirmedDrives,
    },
    {
      label: "Completed drives",
      current:
        compareScope === "global"
          ? globalCurrentMetrics.completedDrives
          : companyCurrentMetrics.completedDrives,
      previous:
        compareScope === "global"
          ? globalPreviousMetrics.completedDrives
          : companyPreviousMetrics.completedDrives,
    },
    {
      label: "Conflict flagged",
      current:
        compareScope === "global"
          ? globalCurrentMetrics.conflictDrives
          : companyCurrentMetrics.conflictDrives,
      previous:
        compareScope === "global"
          ? globalPreviousMetrics.conflictDrives
          : companyPreviousMetrics.conflictDrives,
    },
  ];

  if (isBootLoading) {
    return <DrivesLoadingView />;
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in xl:h-full xl:overflow-y-auto hide-scrollbar">
      <section className="card p-4 lg:p-5 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xl font-semibold text-slate-900">
              Drives Intelligence
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Season-level pipeline intelligence built from current cycle and
              drive data.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedSeason && (
              <Badge variant="info" dot>
                {selectedSeason.seasonType === "intern"
                  ? "Intern"
                  : "Placement"}
              </Badge>
            )}
            {selectedSeason?.isActive && (
              <Badge variant="success" dot>
                Active season
              </Badge>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void loadSeasonData(selectedSeasonId, true)}
              disabled={isRefreshing || !selectedSeasonId}
            >
              <RefreshCcw
                size={14}
                className={isRefreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-6">
          <select
            className="input-base xl:col-span-2"
            value={selectedSeasonId}
            onChange={(event) => {
              setSelectedSeasonId(event.target.value);
              setActiveKpiFilter("all");
            }}
          >
            <option value="">Select season</option>
            {seasonOptions.map((season) => (
              <option key={season.value} value={season.value}>
                {season.label}
              </option>
            ))}
          </select>

          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search companies or drive title"
            className="xl:col-span-2"
          />

          <FilterSelect
            multiple
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
            placeholder="Status"
            className="w-full"
          />

          <FilterSelect
            multiple
            value={stageFilter}
            onChange={setStageFilter}
            options={STAGE_OPTIONS}
            placeholder="Stage"
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="text-sm text-slate-600 flex items-center gap-2">
            <CalendarRange size={14} className="text-slate-400" />
            <span>From</span>
            <input
              type="date"
              className="input-base"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </label>

          <label className="text-sm text-slate-600 flex items-center gap-2">
            <CalendarRange size={14} className="text-slate-400" />
            <span>To</span>
            <input
              type="date"
              className="input-base"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </label>

          <button
            type="button"
            className="btn btn-secondary w-full md:w-auto justify-center"
            onClick={clearFilters}
          >
            <Filter size={14} />
            Reset Filters
          </button>

          <button
            type="button"
            className="btn btn-secondary w-full md:w-auto justify-center"
            onClick={() => setIsCompareOpen(true)}
            disabled={seasons.length < 2 || !selectedSeasonId}
          >
            <ArrowLeftRight size={14} />
            Compare
          </button>

          <button
            type="button"
            className="btn btn-primary w-full md:w-auto justify-center xl:col-span-2"
            onClick={exportCsv}
            disabled={!canExport || rows.length === 0}
            title={
              canExport
                ? "Export visible rows"
                : "Export is available for coordinator and admin roles"
            }
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </section>

      {!selectedSeasonId ? (
        <div className="card">
          <EmptyState
            icon={CalendarRange}
            title="Select a season to start"
            description="Choose a recruitment season to view pipeline and drive insights."
          />
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {[
              {
                key: "all" as KpiFilterKey,
                title: "Companies",
                value: toolbarSummary.companies,
                icon: Users,
                variant: "info" as const,
              },
              {
                key: "status:not_contacted" as KpiFilterKey,
                title: "Not Contacted",
                value: toolbarSummary.statusCounts.not_contacted,
                icon: Building2,
                variant: "gray" as const,
              },
              {
                key: "status:contacted" as KpiFilterKey,
                title: "Contacted",
                value: toolbarSummary.statusCounts.contacted,
                icon: Building2,
                variant: "info" as const,
              },
              {
                key: "status:positive" as KpiFilterKey,
                title: "Positive",
                value: toolbarSummary.statusCounts.positive,
                icon: BarChart3,
                variant: "purple" as const,
              },
              {
                key: "status:accepted" as KpiFilterKey,
                title: "Accepted",
                value: toolbarSummary.statusCounts.accepted,
                icon: Building2,
                variant: "success" as const,
              },
              {
                key: "status:rejected" as KpiFilterKey,
                title: "Rejected",
                value: toolbarSummary.statusCounts.rejected,
                icon: TriangleAlert,
                variant: "danger" as const,
              },
              {
                key: "drives:total" as KpiFilterKey,
                title: "Total Drives",
                value: toolbarSummary.totalDrives,
                icon: Briefcase,
                variant: "info" as const,
              },
              {
                key: "drives:confirmed" as KpiFilterKey,
                title: "Confirmed",
                value: toolbarSummary.confirmedDrives,
                icon: BarChart3,
                variant: "success" as const,
              },
              {
                key: "drives:completed" as KpiFilterKey,
                title: "Completed",
                value: toolbarSummary.completedDrives,
                icon: BarChart3,
                variant: "warning" as const,
              },
              {
                key: "drives:conflict" as KpiFilterKey,
                title: "Conflict Flagged",
                value: toolbarSummary.conflictDrives,
                icon: TriangleAlert,
                variant: "danger" as const,
              },
            ].map((item) => {
              const active = activeKpiFilter === item.key;
              const Icon = item.icon;

              return (
                <button
                  key={item.title}
                  className={`card p-4 text-left transition-all ${
                    active
                      ? "ring-2 ring-[#2563EB] shadow-[0_10px_30px_rgba(37,99,235,0.2)]"
                      : "hover:-translate-y-0.5 hover:shadow-md"
                  }`}
                  onClick={() => setActiveKpiFilter(item.key)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={item.variant} size="sm" dot>
                      {item.title}
                    </Badge>
                    <div className="h-8 w-8 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center text-[#2563EB]">
                      <Icon size={15} />
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">
                    {item.value}
                  </p>
                </button>
              );
            })}
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="card p-4 lg:p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-800">
                  Season Status Pipeline
                </p>
                <Badge variant="info" size="sm">
                  {rows.length} companies
                </Badge>
              </div>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        name: "Pipeline",
                        not_contacted:
                          toolbarSummary.statusCounts.not_contacted,
                        contacted: toolbarSummary.statusCounts.contacted,
                        positive: toolbarSummary.statusCounts.positive,
                        accepted: toolbarSummary.statusCounts.accepted,
                        rejected: toolbarSummary.statusCounts.rejected,
                      },
                    ]}
                    margin={{ top: 12, right: 16, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                    <YAxis
                      allowDecimals={false}
                      stroke="#64748B"
                      fontSize={12}
                    />
                    <Tooltip cursor={{ fill: "rgba(37,99,235,0.08)" }} />
                    <Legend />
                    {STATUS_OPTIONS.map((status) => (
                      <Bar
                        key={status.value}
                        dataKey={status.value}
                        stackId="season"
                        fill={STATUS_COLORS[status.value as CycleStatus]}
                        radius={
                          status.value === "rejected"
                            ? [4, 4, 0, 0]
                            : [0, 0, 0, 0]
                        }
                        name={status.label}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-4 lg:p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-800">
                  Drives Over Time
                </p>
                <Badge variant="info" size="sm">
                  {toolbarSummary.totalDrives} drives
                </Badge>
              </div>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={lineData}
                    margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="period" stroke="#64748B" fontSize={12} />
                    <YAxis
                      allowDecimals={false}
                      stroke="#64748B"
                      fontSize={12}
                    />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#2563EB"
                      strokeWidth={2.5}
                      dot={{ r: 3, strokeWidth: 2, fill: "white" }}
                      activeDot={{ r: 5 }}
                      name="Drives"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-4 lg:p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-800">
                  Stage Distribution
                </p>
                <Badge variant="info" size="sm">
                  Active stages
                </Badge>
              </div>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stageData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {stageData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <div className="card overflow-hidden">
              <div className="border-b border-(--card-border) px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Company Season Rows
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {rows.length} visible rows after filters
                  </p>
                </div>
                {isSeasonLoading && (
                  <span className="text-xs text-[#2563EB] font-medium">
                    Refreshing season...
                  </span>
                )}
              </div>

              {errorMessage ? (
                <EmptyState
                  icon={TriangleAlert}
                  title="Could not load drives analytics"
                  description={errorMessage}
                  action={
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() =>
                        void loadSeasonData(selectedSeasonId, true)
                      }
                    >
                      <RefreshCcw size={14} />
                      Retry
                    </button>
                  }
                />
              ) : rows.length === 0 ? (
                <EmptyState
                  icon={SearchX}
                  title="No rows match your filters"
                  description="Try clearing status, stage, or date filters to broaden the result."
                />
              ) : (
                <>
                  <div className="hidden md:block overflow-auto">
                    <table className="w-full min-w-225 text-sm">
                      <thead>
                        <tr className="text-left text-slate-500 border-b border-slate-100">
                          <th className="px-4 py-3 font-medium">Company</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium">Drives</th>
                          <th className="px-4 py-3 font-medium">Confirmed</th>
                          <th className="px-4 py-3 font-medium">Completed</th>
                          <th className="px-4 py-3 font-medium">
                            Last Activity
                          </th>
                          <th className="px-4 py-3 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => {
                          const active = row.companyId === selectedCompanyId;

                          return (
                            <tr
                              key={row.cycleId}
                              className={`border-b border-slate-100 ${
                                active ? "bg-[#EFF6FF]/60" : "table-row-hover"
                              }`}
                            >
                              <td className="px-4 py-3">
                                <p className="font-medium text-slate-900">
                                  {row.companyName}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {row.industry}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge status={row.status} />
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {row.totalDrives}
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {row.confirmedDrives}
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {row.completedDrives}
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {formatDateTime(row.lastActivity)}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:text-[#1D4ED8]"
                                  onClick={() => {
                                    setSelectedCompanyId(row.companyId);
                                  }}
                                >
                                  Details <ChevronRight size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="md:hidden p-3 space-y-2">
                    {rows.map((row) => (
                      <div
                        key={row.cycleId}
                        className="rounded-xl border border-slate-100 bg-white p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {row.companyName}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {row.industry}
                            </p>
                          </div>
                          <StatusBadge status={row.status} size="sm" />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                            <p className="text-slate-500">Drives</p>
                            <p className="font-semibold text-slate-900">
                              {row.totalDrives}
                            </p>
                          </div>
                          <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                            <p className="text-slate-500">Completed</p>
                            <p className="font-semibold text-slate-900">
                              {row.completedDrives}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="mt-3 btn btn-secondary w-full justify-center"
                          onClick={() => {
                            setSelectedCompanyId(row.companyId);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          View Details
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="hidden xl:block">
              {selectedRow ? (
                <DetailPanel row={selectedRow} />
              ) : (
                <div className="card">
                  <EmptyState
                    icon={Building2}
                    title="Select a company"
                    description="Click any row to open a season detail panel."
                  />
                </div>
              )}
            </div>
          </section>
        </>
      )}

      <Modal
        isOpen={isDetailModalOpen && !!selectedRow}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedRow?.companyName ?? "Company details"}
        size="lg"
      >
        {selectedRow ? <DetailPanel row={selectedRow} /> : null}
      </Modal>

      <Modal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        title="Season Compare"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                Season A
              </p>
              <div className="input-base bg-slate-50">
                {selectedSeason
                  ? `${selectedSeason.name} (${selectedSeason.academicYear})`
                  : "No season selected"}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                Season B
              </p>
              <select
                className="input-base"
                value={compareSeasonId}
                onChange={(event) => setCompareSeasonId(event.target.value)}
              >
                <option value="">Select season</option>
                {seasons
                  .filter((season) => season.id !== selectedSeasonId)
                  .map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name} ({season.academicYear})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-1 flex gap-1">
            <button
              type="button"
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                compareScope === "global"
                  ? "bg-white text-[#2563EB] shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
              onClick={() => setCompareScope("global")}
            >
              Global
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                compareScope === "company"
                  ? "bg-white text-[#2563EB] shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
              onClick={() => setCompareScope("company")}
            >
              Company
            </button>
          </div>

          {compareScope === "company" && (
            <select
              className="input-base"
              value={compareCompanyId}
              onChange={(event) => setCompareCompanyId(event.target.value)}
            >
              <option value="">Select company</option>
              {rows.map((row) => (
                <option key={row.companyId} value={row.companyId}>
                  {row.companyName}
                </option>
              ))}
            </select>
          )}

          {isCompareLoading ? (
            <div className="space-y-2">
              <div className="shimmer h-24 rounded-xl" />
              <div className="shimmer h-24 rounded-xl" />
            </div>
          ) : compareError ? (
            <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm text-[#1D4ED8]">
              {compareError}
            </div>
          ) : !compareSummary || !compareSeasonId ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500 text-center">
              Select a second season to see comparison deltas.
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Comparing against {compareBaselineSeason?.name ?? "Season B"}.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {compareCards.map((card) => {
                  const deltaValue = card.current - card.previous;
                  const deltaPercent = percentageDelta(
                    card.previous,
                    card.current,
                  );

                  return (
                    <div
                      key={card.label}
                      className="rounded-xl border border-slate-100 bg-white p-3"
                    >
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {card.label}
                      </p>
                      <p className="text-2xl font-semibold text-slate-900 mt-1">
                        {card.current}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          deltaValue > 0
                            ? "text-[#2563EB]"
                            : deltaValue < 0
                              ? "text-slate-600"
                              : "text-slate-500"
                        }`}
                      >
                        {asSigned(deltaValue)} ({asSigned(deltaPercent)}%) vs
                        season B
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
