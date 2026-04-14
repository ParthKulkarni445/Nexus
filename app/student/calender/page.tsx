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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Calendar</h1>
        <p className="text-sm text-slate-500 mt-2">
          View your personalized placement schedule synced with Google Calendar
        </p>
      </div>

      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#E2E8F0]">
          <h2 className="text-lg font-semibold text-slate-900">Schedule</h2>
        </div>

        <div className="p-6">
          {embedUrl ? (
            <div className="rounded-xl overflow-hidden border border-[#E2E8F0] bg-white">
              <iframe
                src={embedUrl}
                title="Student Google Calendar"
                className="w-full h-[70vh]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : (
            <div className="rounded-lg border border-[#FCD34D] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
              <p className="font-medium">Calendar not configured</p>
              <p className="text-xs mt-1">
                Google Calendar embed URL is missing. Please contact your administrator to set the configuration.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
