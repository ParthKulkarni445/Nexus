import CalendarEventActionButton from "./CalendarEventActionButton";

const EMBED_ENV_KEYS = [
  "GOOGLE_CALENDAR_EMBED_URL",
  "NEXT_PUBLIC_GOOGLE_CALENDAR_EMBED_URL",
  "GOOGLE_CALENDAR_IFRAME",
] as const;

const PUBLIC_CALENDAR_ENV_KEYS = [
  "GOOGLE_CALENDAR_PUBLIC_URL",
  "NEXT_PUBLIC_GOOGLE_CALENDAR_PUBLIC_URL",
  "GOOGLE_CALENDAR_ICS_URL",
] as const;

function extractIframeSrc(value: string) {
  const iframeSrcMatch = value.match(/src=["']([^"']+)["']/i);
  if (iframeSrcMatch?.[1]) {
    return iframeSrcMatch[1].trim();
  }

  return value.trim();
}

function resolveEmbedUrl() {
  for (const key of EMBED_ENV_KEYS) {
    const envValue = process.env[key];
    if (!envValue?.trim()) {
      continue;
    }

    const src = extractIframeSrc(envValue);
    if (!src) {
      continue;
    }

    try {
      const parsed = new URL(src);
      if (parsed.protocol !== "https:") {
        continue;
      }
      return parsed.toString();
    } catch {
      continue;
    }
  }

  return null;
}

function resolvePublicCalendarUrl() {
  for (const key of PUBLIC_CALENDAR_ENV_KEYS) {
    const envValue = process.env[key]?.trim();
    if (!envValue) {
      continue;
    }

    try {
      const parsed = new URL(envValue);
      if (parsed.protocol !== "https:" && parsed.protocol !== "webcal:") {
        continue;
      }
      return parsed.toString();
    } catch {
      continue;
    }
  }

  return null;
}

function toHttpsCalendarUrl(url: string) {
  if (url.startsWith("webcal://")) {
    return `https://${url.slice("webcal://".length)}`;
  }
  return url;
}

export default function CalenderPage() {
  const embedUrl = resolveEmbedUrl();
  const publicCalendarUrl = resolvePublicCalendarUrl();
  const publicHttpsUrl = publicCalendarUrl
    ? toHttpsCalendarUrl(publicCalendarUrl)
    : null;

  return (
    <div className="pb-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Calender</h1>
            <p className="text-sm text-slate-500 mt-1">
              Google Calender view for placement operations.
            </p>
          </div>
          <div className="flex gap-2 sm:shrink-0">
            <CalendarEventActionButton />
            <a
              href={publicHttpsUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn btn-primary btn-sm ${publicHttpsUrl ? "" : "pointer-events-none opacity-50"}`}
              aria-disabled={!publicHttpsUrl}
            >
              Add to My Calendar
            </a>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title="Google Calender"
              className="w-full h-[72vh] rounded-xl border border-slate-200 bg-white"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Google Calendar embed URL is missing. Set one of these env variables
              and reload: GOOGLE_CALENDAR_EMBED_URL,
              NEXT_PUBLIC_GOOGLE_CALENDAR_EMBED_URL, or GOOGLE_CALENDAR_IFRAME.
            </div>
          )}
        </div>

        {!publicCalendarUrl && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Public calendar URL is missing for add-to-calendar action. Set one of:
            GOOGLE_CALENDAR_PUBLIC_URL, NEXT_PUBLIC_GOOGLE_CALENDAR_PUBLIC_URL,
            or GOOGLE_CALENDAR_ICS_URL.
          </div>
        )}
      </div>
    </div>
  );
}
