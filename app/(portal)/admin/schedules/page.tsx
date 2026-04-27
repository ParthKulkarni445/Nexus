import Link from "next/link";

const CREATE_URL_ENV_KEYS = [
  "NEXT_PUBLIC_ADMIN_GOOGLE_CALENDAR_CREATE_URL",
  "NEXT_PUBLIC_GOOGLE_CALENDAR_CREATE_URL",
] as const;

function resolveCreateUrl() {
  for (const key of CREATE_URL_ENV_KEYS) {
    const value = process.env[key];
    if (!value?.trim()) {
      continue;
    }

    try {
      const parsed = new URL(value.trim());
      if (parsed.protocol === "https:") {
        return parsed.toString();
      }
    } catch {
      continue;
    }
  }

  return "https://calendar.google.com/calendar/render?action=TEMPLATE";
}

export default function AdminSchedulesPage() {
  const createUrl = resolveCreateUrl();

  return (
    <div className="pb-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h1 className="text-2xl font-bold text-slate-900">Schedule Operations</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage placement scheduling through Google Calendar.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <a
            href={createUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800 hover:bg-blue-100"
          >
            Create Calendar Event
          </a>

          <Link
            href="/calender"
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-100"
          >
            Open Admin Calendar
          </Link>
        </div>
      </div>
    </div>
  );
}
