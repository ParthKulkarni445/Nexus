"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import {
  Building2,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
} from "lucide-react";

type ScheduleItem = {
  id: string;
  companyId: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  status: "scheduled" | "rescheduled" | "cancelled";
  company: {
    id: string;
    name: string;
  };
};

type ApiResponse<T> = {
  data?: T;
  error?: {
    message?: string;
  };
};

type PositionedEvent = {
  item: ScheduleItem;
  left: number;
  width: number;
  top: number;
  height: number;
  displayStartMinute: number;
};

type DayEventSlice = {
  item: ScheduleItem;
  startMinute: number;
  endMinute: number;
};

type ScheduleViewMode = "upcoming" | "archive";

const DAY_START_HOUR = 0;
const DAY_END_HOUR = 24;
const PIXELS_PER_HOUR = 56;
const EVENT_LANE_HEIGHT = 30;
const EVENT_ROW_PADDING = 8;
const MIN_EVENT_WIDTH = 54;

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTimeOnly(value: string) {
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatHourLabel(hour: number) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    hour12: true,
  });
}

function formatMinuteLabel(minuteOfDay: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setMinutes(Math.max(0, Math.min(minuteOfDay, 24 * 60)));
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDayHeader(value: Date) {
  return value.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function formatWeekRange(start: Date, end: Date) {
  return `${start.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  })} - ${end.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
}

function toDayKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekStart(value: Date) {
  const date = new Date(value);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + mondayOffset);
  return date;
}

function addDays(value: Date, count: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + count);
  return date;
}

function getMinuteOfDay(value: Date) {
  return value.getHours() * 60 + value.getMinutes();
}

function getEventDurationLabel(startTime: string, endTime: string) {
  const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
  const totalMinutes = Math.max(Math.round(durationMs / 60000), 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

function eventCardTone(status: ScheduleItem["status"]) {
  if (status === "rescheduled") {
    return "border-blue-200 bg-blue-50/95";
  }
  if (status === "cancelled") {
    return "border-rose-200 bg-rose-50/95";
  }
  return "border-sky-200 bg-sky-50/95";
}

function buildPositionedEvents(dayItems: DayEventSlice[]): PositionedEvent[] {
  const dayStartMinute = DAY_START_HOUR * 60;
  const dayEndMinute = DAY_END_HOUR * 60;
  const positioned: Array<{
    item: ScheduleItem;
    startMinute: number;
    endMinute: number;
    lane: number;
  }> = [];

  const normalized = dayItems
    .map((item) => {
      const startMinute = Math.max(dayStartMinute, Math.min(item.startMinute, dayEndMinute));
      const endMinute = Math.max(startMinute + 10, Math.min(item.endMinute, dayEndMinute));
      return {
        item: item.item,
        startMinute,
        endMinute,
      };
    })
    .sort((a, b) => a.startMinute - b.startMinute);

  const active: Array<{ endMinute: number; lane: number }> = [];
  let laneCount = 0;

  for (const entry of normalized) {
    for (let index = active.length - 1; index >= 0; index -= 1) {
      if (active[index].endMinute <= entry.startMinute) {
        active.splice(index, 1);
      }
    }

    const usedLanes = new Set(active.map((event) => event.lane));

    let lane = 0;
    while (usedLanes.has(lane)) {
      lane += 1;
    }

    active.push({
      endMinute: entry.endMinute,
      lane,
    });

    laneCount = Math.max(laneCount, lane + 1);

    positioned.push({
      item: entry.item,
      startMinute: entry.startMinute,
      endMinute: entry.endMinute,
      lane,
    });
  }

  return positioned.map((event) => {
    const totalHours = DAY_END_HOUR - DAY_START_HOUR;
    const left = ((event.startMinute - dayStartMinute) / 60) * PIXELS_PER_HOUR;
    const width = Math.max(
      ((event.endMinute - event.startMinute) / 60) * PIXELS_PER_HOUR,
      MIN_EVENT_WIDTH,
    );
    const top = EVENT_ROW_PADDING + event.lane * EVENT_LANE_HEIGHT;
    const laneHeight = EVENT_LANE_HEIGHT - 6;
    const height = Math.max(laneHeight, 18);

    // Expand row height based on active lanes; referenced in row rendering fallback.
    void totalHours;
    void laneCount;

    return {
      item: event.item,
      left,
      width,
      top,
      height,
      displayStartMinute: event.startMinute,
    };
  });
}

function statusText(status: ScheduleItem["status"]) {
  if (status === "rescheduled") {
    return "Rescheduled";
  }
  if (status === "cancelled") {
    return "Cancelled";
  }
  return "Scheduled";
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
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

  if (!body.data) {
    throw new Error("Invalid response payload");
  }

  return body.data;
}

export default function SchedulePage() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [viewMode, setViewMode] = useState<ScheduleViewMode>("upcoming");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [weekInitialized, setWeekInitialized] = useState(false);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (viewMode === "upcoming") {
        const data = await requestJson<ScheduleItem[]>("/api/v1/schedules/upcoming");
        setItems(data);
      } else {
        const now = new Date();
        const data = await requestJson<ScheduleItem[]>(
          `/api/v1/schedules?to=${encodeURIComponent(now.toISOString())}`,
        );

        const completedPast = data
          .filter((item) => item.status !== "cancelled")
          .filter((item) => new Date(item.endTime).getTime() < now.getTime())
          .sort(
            (a, b) =>
              new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
          );

        setItems(completedPast);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to fetch schedule",
      );
    } finally {
      setLoading(false);
    }
  }, [viewMode]);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  useEffect(() => {
    setWeekInitialized(false);
    setWeekStart(getWeekStart(new Date()));
  }, [viewMode]);

  useEffect(() => {
    if (weekInitialized || items.length === 0) {
      return;
    }
    setWeekStart(getWeekStart(new Date(items[0].startTime)));
    setWeekInitialized(true);
  }, [items, weekInitialized]);

  const summary = useMemo(() => {
    const now = Date.now();

    if (viewMode === "archive") {
      return {
        total: items.length,
        thisWeek: items.filter((item) => {
          const diff = now - new Date(item.endTime).getTime();
          return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
        }).length,
      };
    }

    return {
      total: items.length,
      thisWeek: items.filter((item) => {
        const diff = new Date(item.startTime).getTime() - now;
        return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
      }).length,
    };
  }, [items, viewMode]);

  const daysInWeek = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const timelineWidth = (DAY_END_HOUR - DAY_START_HOUR) * PIXELS_PER_HOUR;
  const hourSlots = useMemo(
    () => Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, index) => DAY_START_HOUR + index),
    [],
  );
  const labelHours = useMemo(
    () => hourSlots.filter((hour) => hour % 2 === 0),
    [hourSlots],
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, DayEventSlice[]>();

    for (const day of daysInWeek) {
      map.set(toDayKey(day), []);
    }

    for (const item of items) {
      const start = new Date(item.startTime);
      const end = new Date(item.endTime);

      for (const day of daysInWeek) {
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        // Event overlaps this day window.
        if (end > dayStart && start < dayEnd) {
          const segmentStart = start > dayStart ? start : dayStart;
          const segmentEnd = end < dayEnd ? end : dayEnd;
          const key = toDayKey(day);
          const startMinute = Math.max(
            0,
            Math.floor((segmentStart.getTime() - dayStart.getTime()) / 60000),
          );
          const endMinute = Math.max(
            startMinute + 1,
            Math.ceil((segmentEnd.getTime() - dayStart.getTime()) / 60000),
          );

          map.get(key)?.push({
            item,
            startMinute,
            endMinute,
          });
        }
      }
    }

    for (const dayItems of map.values()) {
      dayItems.sort(
        (a, b) =>
          a.startMinute - b.startMinute,
      );
    }

    return map;
  }, [daysInWeek, items]);

  const positionedByDay = useMemo(() => {
    const map = new Map<string, PositionedEvent[]>();
    for (const day of daysInWeek) {
      const dayKey = toDayKey(day);
      const dayItems = eventsByDay.get(dayKey) ?? [];
      map.set(dayKey, buildPositionedEvents(dayItems));
    }
    return map;
  }, [daysInWeek, eventsByDay]);

  return (
    <div className="space-y-5 p-4 lg:p-6 animate-fade-in">
      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]">
              Student Schedule
            </p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">
              Weekly Calendar
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {viewMode === "upcoming"
                ? "A calendar view of upcoming events from the database, grouped by day."
                : "A calendar view of completed past events from the database archive."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:max-w-xs">
            <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2.5">
              <p className="text-xs text-[#1D4ED8]">
                {viewMode === "upcoming" ? "Upcoming" : "Archived"}
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{summary.total}</p>
            </div>
            <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2.5">
              <p className="text-xs text-[#1D4ED8]">
                {viewMode === "upcoming" ? "This Week" : "Last 7 Days"}
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{summary.thisWeek}</p>
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setViewMode("upcoming")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "upcoming"
                    ? "bg-[#2563EB] text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Upcoming
              </button>
              <button
                type="button"
                onClick={() => setViewMode("archive")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "archive"
                    ? "bg-[#2563EB] text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <section className="card p-4 border border-blue-100 bg-blue-50 text-sm text-blue-700">
          {error}
        </section>
      ) : null}

      <section className="card p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <CalendarDays size={15} />
            {formatWeekRange(weekStart, weekEnd)}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWeekStart((prev) => addDays(prev, -7))}
              className="btn btn-ghost btn-sm"
            >
              <ChevronLeft size={14} />
              Prev
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(getWeekStart(new Date()))}
              className="btn btn-ghost btn-sm"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setWeekStart((prev) => addDays(prev, 7))}
              className="btn btn-ghost btn-sm"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="h-36 rounded-xl border border-slate-100 bg-slate-50 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title={viewMode === "upcoming" ? "No scheduled events yet" : "No archived events yet"}
            description={
              viewMode === "upcoming"
                ? "Upcoming events will appear here once they are published by admins."
                : "Completed events will appear here after their end time passes."
            }
          />
        ) : (
          <div className="schedule-scroll overflow-x-auto overflow-y-auto max-h-[72vh] rounded-xl border border-slate-200 bg-white p-1.5 sm:p-2">
            <div className="min-w-[1600px] space-y-1.5">
              <div className="grid grid-cols-[110px_1fr] gap-1">
                <div className="rounded-md border border-slate-200 bg-slate-50" />
                <div className="relative rounded-md border border-slate-200 bg-slate-50" style={{ width: `${timelineWidth}px`, height: "42px" }}>
                  {hourSlots.map((hour) => {
                    const left = ((hour - DAY_START_HOUR) / (DAY_END_HOUR - DAY_START_HOUR)) * timelineWidth;
                    const isLastTick = hour === DAY_END_HOUR;
                    return (
                      <div
                        key={`hour-header-${hour}`}
                        className="absolute top-0 bottom-0 border-l border-slate-200"
                        style={{ left: `${left}px` }}
                      >
                        {labelHours.includes(hour) ? (
                          <span
                            className={`absolute top-1 text-[9px] font-medium text-slate-500 sm:text-[10px] ${
                              isLastTick ? "left-0 -translate-x-full" : "left-1"
                            }`}
                          >
                            {formatHourLabel(hour)}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {daysInWeek.map((day) => {
                const dayKey = toDayKey(day);
                const dayItems = eventsByDay.get(dayKey) ?? [];
                const positioned = positionedByDay.get(dayKey) ?? [];
                const laneCount = Math.max(1, ...positioned.map((event) => Math.round((event.top - EVENT_ROW_PADDING) / EVENT_LANE_HEIGHT) + 1));
                const rowHeight = Math.max(58, EVENT_ROW_PADDING * 2 + laneCount * EVENT_LANE_HEIGHT);

                return (
                  <div key={`row-${dayKey}`} className="grid grid-cols-[110px_1fr] gap-1">
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-600 sm:text-xs">
                        {formatDayHeader(day)}
                      </p>
                      <p className="text-xs font-semibold text-slate-500 sm:text-sm">
                        {dayItems.length} events
                      </p>
                    </div>

                    <section
                      className="relative overflow-hidden rounded-md border border-slate-200 bg-gradient-to-b from-[#EFF6FF] via-[#F8FAFC] to-[#FFFFFF]"
                      style={{ width: `${timelineWidth}px`, height: `${rowHeight}px` }}
                    >
                      {hourSlots.map((hour) => {
                        const left = ((hour - DAY_START_HOUR) / (DAY_END_HOUR - DAY_START_HOUR)) * timelineWidth;
                        return (
                          <div
                            key={`${dayKey}-grid-${hour}`}
                            className="absolute top-0 bottom-0 border-l border-slate-100/90"
                            style={{ left: `${left}px` }}
                          />
                        );
                      })}

                      {positioned.map((event) => (
                        <article
                          key={event.item.id}
                          className={`absolute overflow-hidden rounded border px-1 py-0.5 shadow-sm ${eventCardTone(
                            event.item.status,
                          )}`}
                          style={{
                            left: `${event.left}px`,
                            width: `${event.width}px`,
                            top: `${event.top}px`,
                            height: `${event.height}px`,
                          }}
                        >
                          <p className="truncate text-[8px] font-semibold leading-tight text-slate-900 sm:text-[9px]">
                            {event.item.title}
                          </p>
                          <p className="truncate text-[8px] leading-tight text-slate-600 sm:text-[9px]">
                            {formatMinuteLabel(event.displayStartMinute)}
                          </p>
                        </article>
                      ))}
                    </section>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {!loading && items.length > 0 ? (
        <section className="card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              {viewMode === "upcoming" ? "Upcoming Events" : "Archived Events"}
            </h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
              Top {Math.min(items.length, 10)}
            </span>
          </div>

          <div className="space-y-2.5">
            {items.slice(0, 10).map((item) => (
              <article key={`upcoming-${item.id}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                  <span className="text-xs font-medium text-slate-500">{statusText(item.status)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{item.company.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDateTime(item.startTime)} to {formatDateTime(item.endTime)}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
