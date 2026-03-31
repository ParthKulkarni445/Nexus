"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";

type ActionType = "create" | "edit" | "delete";
type PickerTarget = "start" | "end";

type DateTimeDraft = {
  date: string;
  hour: string;
  minute: string;
  meridiem: "AM" | "PM";
};

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

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 1 ||
    hour > 12 ||
    minute < 0 ||
    minute > 59
  ) {
    return "";
  }

  let hour24 = hour % 12;
  if (draft.meridiem === "PM") {
    hour24 += 12;
  }

  return `${draft.date}T${String(hour24).padStart(2, "0")}:${String(
    minute,
  ).padStart(2, "0")}`;
}

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

async function parseApiResponse(response: Response) {
  const payload = await response.json().catch(() => null);
  const message = payload?.error?.message ?? "Request failed";

  if (!response.ok) {
    throw new Error(message);
  }

  return payload?.data;
}

export default function CalendarEventActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [action, setAction] = useState<ActionType>("create");
  const [openPicker, setOpenPicker] = useState<PickerTarget | null>(null);
  const [eventId, setEventId] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [startDraft, setStartDraft] = useState<DateTimeDraft>(defaultDraft);
  const [endDraft, setEndDraft] = useState<DateTimeDraft>(defaultDraft);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  function openModal() {
    setIsOpen(true);
    setFormError(null);
    setFormSuccess(null);
  }

  function closeModal() {
    if (isBusy) return;
    setIsOpen(false);
    setOpenPicker(null);
    setFormError(null);
    setFormSuccess(null);
  }

  function openStartPickerDialog() {
    setStartDraft(toDraft(start));
    setOpenPicker("start");
  }

  function openEndPickerDialog() {
    setEndDraft(toDraft(end));
    setOpenPicker("end");
  }

  function saveStartDateTimeSelection() {
    const nextValue = draftToDateTimeLocal(startDraft);
    if (!nextValue) {
      setFormError("Please choose a valid start date/time.");
      return;
    }

    setStart(nextValue);
    setOpenPicker(null);
    setFormError(null);
    setFormSuccess(null);
  }

  function saveEndDateTimeSelection() {
    const nextValue = draftToDateTimeLocal(endDraft);
    if (!nextValue) {
      setFormError("Please choose a valid end date/time.");
      return;
    }

    setEnd(nextValue);
    setOpenPicker(null);
    setFormError(null);
    setFormSuccess(null);
  }

  function toIsoString(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid date/time selected.");
    }
    return date.toISOString();
  }

  function validateForm() {
    if (action === "create") {
      if (!summary.trim()) {
        return "Title is required for create action.";
      }
      if (!start.trim() || !end.trim()) {
        return "Start and end date-time are required for create action.";
      }

      const startDateTime = new Date(start);
      const endDateTime = new Date(end);

      if (startDateTime >= endDateTime) {
        return "End time must be after start time.";
      }

      return null;
    }

    if (action === "edit") {
      if (!eventId.trim()) {
        return "Event ID is required for edit action.";
      }

      const hasAnyUpdate =
        summary.trim() ||
        description.trim() ||
        location.trim() ||
        start.trim() ||
        end.trim();

      if (!hasAnyUpdate) {
        return "Provide at least one field to update for edit action.";
      }

      if (start.trim() && end.trim()) {
        const startDateTime = new Date(start);
        const endDateTime = new Date(end);

        if (startDateTime >= endDateTime) {
          return "End time must be after start time.";
        }
      }

      return null;
    }

    if (!eventId.trim()) {
      return "Event ID is required for delete action.";
    }

    return null;
  }

  async function submitAction() {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      setFormSuccess(null);
      return;
    }

    setIsBusy(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      if (action === "create") {
        const response = await fetch("/api/v1/google-calendar/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            summary: summary.trim(),
            description: description.trim() || undefined,
            location: location.trim() || undefined,
            start: toIsoString(start),
            end: toIsoString(end),
          }),
        });

        const data = await parseApiResponse(response);
        setFormSuccess(`Event created successfully. Event ID: ${data?.id ?? "n/a"}`);
        return;
      }

      if (action === "edit") {
        const response = await fetch(
          `/api/v1/google-calendar/events/${eventId.trim()}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              summary: summary.trim() || undefined,
              description: description.trim() || undefined,
              location: location.trim() || undefined,
              start: start.trim() ? toIsoString(start) : undefined,
              end: end.trim() ? toIsoString(end) : undefined,
            }),
          },
        );

        await parseApiResponse(response);
        setFormSuccess("Event updated successfully.");
        return;
      }

      const response = await fetch(
        `/api/v1/google-calendar/events/${eventId.trim()}`,
        {
          method: "DELETE",
        },
      );

      await parseApiResponse(response);
      setFormSuccess("Event deleted successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      setFormError(message);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="btn btn-primary btn-sm"
      >
        Add/Edit Event
      </button>

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title="Manage Calendar Event"
        size="md"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={closeModal}
              disabled={isBusy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void submitAction()}
              disabled={isBusy}
            >
              {isBusy ? "Working..." : "Submit"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          {formSuccess && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {formSuccess}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Action Type
            </label>
            <select
              className="input-base"
              value={action}
              onChange={(event) => {
                setAction(event.target.value as ActionType);
                setOpenPicker(null);
                setFormError(null);
                setFormSuccess(null);
              }}
              disabled={isBusy}
            >
              <option value="create">Create</option>
              <option value="edit">Edit</option>
              <option value="delete">Delete</option>
            </select>
          </div>

          {(action === "edit" || action === "delete") && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Event ID
              </label>
              <input
                className="input-base"
                value={eventId}
                onChange={(event) => setEventId(event.target.value)}
                placeholder="Enter Google Calendar event ID"
                disabled={isBusy}
              />
            </div>
          )}

          {(action === "create" || action === "edit") && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Title
                </label>
                <input
                  className="input-base"
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  placeholder="Event title"
                  disabled={isBusy}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  className="input-base"
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional description"
                  disabled={isBusy}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Location
                </label>
                <input
                  className="input-base"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Optional location"
                  disabled={isBusy}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Start Time</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={openStartPickerDialog}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 focus:border-[#2563EB] focus:outline-none"
                      disabled={isBusy}
                    >
                      {start ? formatDateTime(start) : "Select start date and time"}
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
                                  setStartDraft((prev) => ({
                                    ...prev,
                                    meridiem: event.target.value as "AM" | "PM",
                                  }))
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
                  <span className="text-sm font-medium text-slate-700">End Time</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={openEndPickerDialog}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 focus:border-[#2563EB] focus:outline-none"
                      disabled={isBusy}
                    >
                      {end ? formatDateTime(end) : "Select end date and time"}
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
                                  setEndDraft((prev) => ({
                                    ...prev,
                                    meridiem: event.target.value as "AM" | "PM",
                                  }))
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
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}