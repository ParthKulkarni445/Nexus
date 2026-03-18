"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import { CalendarClock, Plus, RefreshCw, Trash2 } from "lucide-react";

type Company = {
  id: string;
  name: string;
};

type CompanyRecord = {
  id: string;
  name: string;
  currentStatus?: string | null;
};

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
  meta?: {
    page?: number;
    totalPages?: number;
  };
  error?: {
    message?: string;
  };
};

type FormState = {
  companyId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
};

type DateTimeDraft = {
  date: string;
  hour: string;
  minute: string;
  meridiem: "AM" | "PM";
};

const INITIAL_FORM: FormState = {
  companyId: "",
  title: "",
  description: "",
  startTime: "",
  endTime: "",
};

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

function defaultDraft(): DateTimeDraft {
  return {
    date: "",
    hour: "12",
    minute: "00",
    meridiem: "AM",
  };
}

function toDraft(value: string): DateTimeDraft {
  if (!value) {
    return defaultDraft();
  }

  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) {
    return defaultDraft();
  }

  const [hourText, minuteText] = timePart.split(":");
  const hour24 = Number(hourText);
  const minute = Number(minuteText);

  if (Number.isNaN(hour24) || Number.isNaN(minute)) {
    return defaultDraft();
  }

  const meridiem: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  return {
    date: datePart,
    hour: String(hour12).padStart(2, "0"),
    minute: String(minute).padStart(2, "0"),
    meridiem,
  };
}

function draftToDateTimeLocal(draft: DateTimeDraft): string {
  if (!draft.date) {
    return "";
  }

  const hour = Number(draft.hour);
  const minute = Number(draft.minute);

  if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 1 || hour > 12 || minute < 0 || minute > 59) {
    return "";
  }

  let hour24 = hour % 12;
  if (draft.meridiem === "PM") {
    hour24 += 12;
  }

  return `${draft.date}T${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function toInputDateTimeValue(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function statusBadge(status: ScheduleItem["status"]) {
  if (status === "rescheduled") {
    return (
      <Badge variant="warning" size="sm">
        Rescheduled
      </Badge>
    );
  }
  if (status === "cancelled") {
    return (
      <Badge variant="danger" size="sm">
        Cancelled
      </Badge>
    );
  }

  return (
    <Badge variant="success" size="sm">
      Scheduled
    </Badge>
  );
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
    if ((response.status === 401 || response.status === 403) && typeof window !== "undefined") {
      window.location.href = response.status === 401 ? "/login" : "/unauthorized";
    }
    throw new Error(body.error?.message ?? "Request failed");
  }

  if (!body.data) {
    throw new Error("Invalid response payload");
  }

  return body.data;
}

async function fetchAcceptedCompanies(): Promise<Company[]> {
  const acceptedById = new Map<string, Company>();
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await fetch(`/api/v1/companies?limit=100&page=${page}`, {
      credentials: "include",
    });

    const text = await response.text();
    let body: ApiResponse<CompanyRecord[]> = {};

    if (text) {
      try {
        body = JSON.parse(text) as ApiResponse<CompanyRecord[]>;
      } catch {
        body = {};
      }
    }

    if (!response.ok) {
      throw new Error(body.error?.message ?? "Failed to load companies");
    }

    const companies = body.data ?? [];
    for (const company of companies) {
      if (company.currentStatus === "accepted") {
        acceptedById.set(company.id, { id: company.id, name: company.name });
      }
    }

    totalPages = Math.max(body.meta?.totalPages ?? page, page);
    page += 1;
  }

  return Array.from(acceptedById.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export default function AdminSchedulesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [openPicker, setOpenPicker] = useState<"start" | "end" | null>(null);
  const [startDraft, setStartDraft] = useState<DateTimeDraft>(defaultDraft);
  const [endDraft, setEndDraft] = useState<DateTimeDraft>(defaultDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [companiesList, scheduleList] = await Promise.all([
        fetchAcceptedCompanies(),
        requestJson<ScheduleItem[]>("/api/v1/schedules"),
      ]);

      setCompanies(companiesList);
      setSchedules(scheduleList);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Failed to load schedule",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const canSubmit = useMemo(() => {
    return Boolean(
      form.companyId
        && form.title.trim()
        && form.startTime
        && form.endTime,
    );
  }, [form]);

  function resetForm() {
    setForm(INITIAL_FORM);
    setOpenPicker(null);
    setStartDraft(defaultDraft());
    setEndDraft(defaultDraft());
    setEditingId(null);
  }

  function validateDateTimeRange() {
    const startDateTime = new Date(form.startTime);
    const endDateTime = new Date(form.endTime);

    if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
      throw new Error("Please provide a valid event date and time range");
    }

    if (startDateTime >= endDateTime) {
      throw new Error("End time must be after start time");
    }

    return { startDateTime, endDateTime };
  }

  function openStartPickerDialog() {
    setStartDraft(toDraft(form.startTime));
    setOpenPicker("start");
  }

  function openEndPickerDialog() {
    setEndDraft(toDraft(form.endTime));
    setOpenPicker("end");
  }

  function saveStartDateTimeSelection() {
    const nextValue = draftToDateTimeLocal(startDraft);
    if (!nextValue) {
      setError("Please select valid start date and time");
      return;
    }
    setError(null);
    setForm((prev) => ({ ...prev, startTime: nextValue }));
    setOpenPicker(null);
  }

  function saveEndDateTimeSelection() {
    const nextValue = draftToDateTimeLocal(endDraft);
    if (!nextValue) {
      setError("Please select valid end date and time");
      return;
    }
    setError(null);
    setForm((prev) => ({ ...prev, endTime: nextValue }));
    setOpenPicker(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { startDateTime, endDateTime } = validateDateTimeRange();

      const payload = {
        companyId: form.companyId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
      };

      if (editingId) {
        await requestJson<ScheduleItem>(`/api/v1/schedules/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson<ScheduleItem>("/api/v1/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      resetForm();
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save schedule");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item: ScheduleItem) {
    setEditingId(item.id);
    setForm({
      companyId: item.companyId,
      title: item.title,
      description: item.description ?? "",
      startTime: toInputDateTimeValue(item.startTime),
      endTime: toInputDateTimeValue(item.endTime),
    });
    setOpenPicker(null);
  }

  async function cancelEvent(id: string) {
    setError(null);
    try {
      await requestJson<ScheduleItem>(`/api/v1/schedules/${id}`, {
        method: "DELETE",
      });
      await loadData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to cancel schedule",
      );
    }
  }

  return (
    <div className="space-y-5 p-4 lg:p-6 animate-fade-in">
      <section className="card p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]">
          Admin Console
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">
          Schedule Management
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Add, update, and cancel schedule events. Student view updates automatically.
        </p>
      </section>

      {error ? (
        <section className="card p-4 border border-blue-100 bg-blue-50 text-sm text-blue-700">
          {error}
        </section>
      ) : null}

      <section className="card p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-slate-900">
          {editingId ? "Edit Event" : "Create Event"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-slate-600">Company</span>
            <select
              value={form.companyId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, companyId: event.target.value }))
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-[#2563EB] focus:outline-none"
              required
            >
              <option value="">Select company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-slate-600">Title</span>
            <input
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-[#2563EB] focus:outline-none"
              placeholder="Event title"
              required
            />
          </label>

          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-600">Start Time</span>
            <div className="relative">
              <button
                type="button"
                onClick={openStartPickerDialog}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 focus:border-[#2563EB] focus:outline-none"
              >
                {form.startTime ? formatDateTime(form.startTime) : "Select start date and time"}
              </button>

              {openPicker === "start" ? (
                <div className="absolute left-0 z-20 mt-2 w-full min-w-[300px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl md:w-[340px]">
                  <div className="grid grid-cols-1 gap-2">
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-slate-600">Date</span>
                      <input
                        type="date"
                        value={startDraft.date}
                        onChange={(event) =>
                          setStartDraft((prev) => ({ ...prev, date: event.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-[#2563EB] focus:outline-none"
                      />
                    </label>

                    <div className="grid grid-cols-3 gap-2">
                      <label className="space-y-1">
                        <span className="text-xs font-medium text-slate-600">Hour</span>
                        <select
                          value={startDraft.hour}
                          onChange={(event) =>
                            setStartDraft((prev) => ({ ...prev, hour: event.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm text-slate-700 focus:border-[#2563EB] focus:outline-none"
                        >
                          {Array.from({ length: 12 }, (_, index) => {
                            const hour = String(index + 1).padStart(2, "0");
                            return (
                              <option key={hour} value={hour}>
                                {hour}
                              </option>
                            );
                          })}
                        </select>
                      </label>

                      <label className="space-y-1">
                        <span className="text-xs font-medium text-slate-600">Minute</span>
                        <select
                          value={startDraft.minute}
                          onChange={(event) =>
                            setStartDraft((prev) => ({ ...prev, minute: event.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm text-slate-700 focus:border-[#2563EB] focus:outline-none"
                        >
                          {Array.from({ length: 60 }, (_, index) => {
                            const minute = String(index).padStart(2, "0");
                            return (
                              <option key={minute} value={minute}>
                                {minute}
                              </option>
                            );
                          })}
                        </select>
                      </label>

                      <label className="space-y-1">
                        <span className="text-xs font-medium text-slate-600">AM/PM</span>
                        <select
                          value={startDraft.meridiem}
                          onChange={(event) =>
                            setStartDraft((prev) => ({ ...prev, meridiem: event.target.value as "AM" | "PM" }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm text-slate-700 focus:border-[#2563EB] focus:outline-none"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </label>
                    </div>

                    <div className="mt-1 flex items-center gap-2">
                      <button type="button" onClick={saveStartDateTimeSelection} className="btn btn-primary btn-sm">
                        Save
                      </button>
                      <button type="button" onClick={() => setOpenPicker(null)} className="btn btn-ghost btn-sm">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-600">End Time</span>
            <div className="relative">
              <button
                type="button"
                onClick={openEndPickerDialog}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 focus:border-[#2563EB] focus:outline-none"
              >
                {form.endTime ? formatDateTime(form.endTime) : "Select end date and time"}
              </button>

              {openPicker === "end" ? (
                <div className="absolute left-0 z-20 mt-2 w-full min-w-[300px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl md:w-[340px]">
                  <div className="grid grid-cols-1 gap-2">
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-slate-600">Date</span>
                      <input
                        type="date"
                        value={endDraft.date}
                        onChange={(event) =>
                          setEndDraft((prev) => ({ ...prev, date: event.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-[#2563EB] focus:outline-none"
                      />
                    </label>

                    <div className="grid grid-cols-3 gap-2">
                      <label className="space-y-1">
                        <span className="text-xs font-medium text-slate-600">Hour</span>
                        <select
                          value={endDraft.hour}
                          onChange={(event) =>
                            setEndDraft((prev) => ({ ...prev, hour: event.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm text-slate-700 focus:border-[#2563EB] focus:outline-none"
                        >
                          {Array.from({ length: 12 }, (_, index) => {
                            const hour = String(index + 1).padStart(2, "0");
                            return (
                              <option key={hour} value={hour}>
                                {hour}
                              </option>
                            );
                          })}
                        </select>
                      </label>

                      <label className="space-y-1">
                        <span className="text-xs font-medium text-slate-600">Minute</span>
                        <select
                          value={endDraft.minute}
                          onChange={(event) =>
                            setEndDraft((prev) => ({ ...prev, minute: event.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm text-slate-700 focus:border-[#2563EB] focus:outline-none"
                        >
                          {Array.from({ length: 60 }, (_, index) => {
                            const minute = String(index).padStart(2, "0");
                            return (
                              <option key={minute} value={minute}>
                                {minute}
                              </option>
                            );
                          })}
                        </select>
                      </label>

                      <label className="space-y-1">
                        <span className="text-xs font-medium text-slate-600">AM/PM</span>
                        <select
                          value={endDraft.meridiem}
                          onChange={(event) =>
                            setEndDraft((prev) => ({ ...prev, meridiem: event.target.value as "AM" | "PM" }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm text-slate-700 focus:border-[#2563EB] focus:outline-none"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </label>
                    </div>

                    <div className="mt-1 flex items-center gap-2">
                      <button type="button" onClick={saveEndDateTimeSelection} className="btn btn-primary btn-sm">
                        Save
                      </button>
                      <button type="button" onClick={() => setOpenPicker(null)} className="btn btn-ghost btn-sm">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <label className="space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-slate-600">Description (optional)</span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-[#2563EB] focus:outline-none"
              placeholder="Event details"
            />
          </label>

          <div className="md:col-span-2 flex flex-wrap items-center gap-2">
            <button type="submit" disabled={!canSubmit || saving} className="btn btn-primary btn-sm">
              {editingId ? <RefreshCw size={14} /> : <Plus size={14} />}
              {saving ? "Saving..." : editingId ? "Save Changes" : "Save Event"}
            </button>
            {editingId ? (
              <button type="button" onClick={resetForm} className="btn btn-ghost btn-sm">
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="card p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Scheduled Events</h2>
          <Badge variant="info" size="sm">
            {schedules.length} items
          </Badge>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-20 rounded-xl border border-slate-100 bg-slate-50 animate-pulse" />
            ))}
          </div>
        ) : schedules.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No events yet"
            description="Create your first schedule event from the form above."
          />
        ) : (
          <div className="space-y-3">
            {schedules.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-[#BFDBFE]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                      {statusBadge(item.status)}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{item.company.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(item.startTime)} to {formatDateTime(item.endTime)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(item)}
                      disabled={item.status === "cancelled"}
                      className="btn btn-ghost btn-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => void cancelEvent(item.id)}
                      disabled={item.status === "cancelled"}
                      className="btn btn-ghost btn-sm text-blue-600"
                    >
                      <Trash2 size={14} />
                      Cancel
                    </button>
                  </div>
                </div>

                {item.description ? (
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    {item.description}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
