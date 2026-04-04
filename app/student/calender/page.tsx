const EMBED_ENV_KEYS = [
  "GOOGLE_CALENDAR_EMBED_URL",
  "NEXT_PUBLIC_GOOGLE_CALENDAR_EMBED_URL",
  "GOOGLE_CALENDAR_IFRAME",
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

export default function StudentCalenderPage() {
  const embedUrl = resolveEmbedUrl();

  return (
    <div className="pb-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calender</h1>
          <p className="text-sm text-slate-500 mt-1">
            Student view of placement schedule synced with Google Calender.
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title="Student Google Calender"
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

      </div>
    </div>
  );
}
