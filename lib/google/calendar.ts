import { calendar_v3, google } from "googleapis";

export class GoogleCalendarConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleCalendarConfigError";
  }
}

export class GoogleCalendarApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "GoogleCalendarApiError";
    this.status = status;
    this.code = code;
  }
}

function getEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new GoogleCalendarConfigError(`Missing environment variable: ${name}`);
  }
  return value;
}

function normalizePrivateKey(rawKey: string): string {
  return rawKey.replace(/\\n/g, "\n");
}

function extractIframeSrc(value: string): string {
  const iframeSrcMatch = value.match(/src=["']([^"']+)["']/i);
  if (iframeSrcMatch?.[1]) {
    return iframeSrcMatch[1].trim();
  }
  return value.trim();
}

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const paddingLength = (4 - (normalized.length % 4)) % 4;
    const padded = `${normalized}${"=".repeat(paddingLength)}`;
    return Buffer.from(padded, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function extractCalendarIdFromUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);

    const src = parsed.searchParams.get("src");
    if (src?.trim()) {
      return decodeURIComponent(src.trim());
    }

    const cid = parsed.searchParams.get("cid");
    if (cid?.trim()) {
      const trimmedCid = cid.trim();
      if (trimmedCid.includes("@") || trimmedCid.includes("%40")) {
        return decodeURIComponent(trimmedCid);
      }

      const decodedCid = decodeBase64Url(trimmedCid);
      if (decodedCid?.includes("@")) {
        return decodedCid;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeCalendarId(rawValue: string): string {
  const cleanedValue = extractIframeSrc(rawValue).trim();

  if (!cleanedValue) {
    return "";
  }

  if (cleanedValue === "primary") {
    return cleanedValue;
  }

  const fromUrl = extractCalendarIdFromUrl(cleanedValue);
  if (fromUrl) {
    return fromUrl;
  }

  if (cleanedValue.includes("%40")) {
    return decodeURIComponent(cleanedValue);
  }

  return cleanedValue;
}

function mapGoogleApiError(error: unknown, calendarId: string): GoogleCalendarApiError {
  const errorStatus =
    (typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof error.status === "number" &&
      error.status) ||
    (typeof error === "object" &&
      error !== null &&
      "response" in error &&
      typeof error.response === "object" &&
      error.response !== null &&
      "status" in error.response &&
      typeof error.response.status === "number" &&
      error.response.status) ||
    500;

  const errorCode =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : undefined;

  if (errorStatus === 404) {
    return new GoogleCalendarApiError(
      `Calendar not found for resolved calendar ID: ${calendarId}. Verify GOOGLE_CALENDAR_ID (or calendar public/embed URL) and ensure the service account has access to this calendar.`,
      404,
      errorCode,
    );
  }

  if (errorStatus === 403) {
    return new GoogleCalendarApiError(
      "Google Calendar permission denied. Share the calendar with GOOGLE_CLIENT_EMAIL and grant 'Make changes to events'.",
      403,
      errorCode,
    );
  }

  if (errorStatus === 401) {
    return new GoogleCalendarApiError(
      "Google Calendar authentication failed. Recheck GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY.",
      401,
      errorCode,
    );
  }

  const errorMessage =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
      ? error.message
      : "Google Calendar request failed";

  return new GoogleCalendarApiError(errorMessage, errorStatus, errorCode);
}

function getCalendarClient() {
  const clientEmail = getEnv("GOOGLE_CLIENT_EMAIL");
  const privateKey = normalizePrivateKey(getEnv("GOOGLE_PRIVATE_KEY"));

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  return google.calendar({ version: "v3", auth });
}

function getCalendarId(): string {
  const directCalendarId = process.env.GOOGLE_CALENDAR_ID?.trim();
  if (directCalendarId) {
    return normalizeCalendarId(directCalendarId);
  }

  const fallbackKeys = [
    "GOOGLE_CALENDAR_PUBLIC_URL",
    "NEXT_PUBLIC_GOOGLE_CALENDAR_PUBLIC_URL",
    "GOOGLE_CALENDAR_EMBED_URL",
    "NEXT_PUBLIC_GOOGLE_CALENDAR_EMBED_URL",
    "GOOGLE_CALENDAR_IFRAME",
  ] as const;

  for (const key of fallbackKeys) {
    const value = process.env[key]?.trim();
    if (!value) {
      continue;
    }

    const resolved = normalizeCalendarId(value);
    if (resolved) {
      return resolved;
    }
  }

  throw new GoogleCalendarConfigError(
    "Missing calendar identifier. Set GOOGLE_CALENDAR_ID, or provide a valid GOOGLE_CALENDAR_PUBLIC_URL / GOOGLE_CALENDAR_EMBED_URL / GOOGLE_CALENDAR_IFRAME.",
  );
}

export interface CreateGoogleCalendarEventInput {
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  timeZone?: string;
}

export interface UpdateGoogleCalendarEventInput {
  summary?: string;
  description?: string;
  location?: string;
  start?: string;
  end?: string;
  timeZone?: string;
}

function mapEventResponse(event: calendar_v3.Schema$Event) {
  return {
    id: event.id ?? null,
    status: event.status ?? null,
    summary: event.summary ?? null,
    htmlLink: event.htmlLink ?? null,
    start: event.start?.dateTime ?? event.start?.date ?? null,
    end: event.end?.dateTime ?? event.end?.date ?? null,
  };
}

export async function createGoogleCalendarEvent(
  input: CreateGoogleCalendarEventInput,
) {
  const calendar = getCalendarClient();
  const calendarId = getCalendarId();

  try {
    const created = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: input.summary,
        description: input.description,
        location: input.location,
        start: {
          dateTime: input.start,
          timeZone: input.timeZone,
        },
        end: {
          dateTime: input.end,
          timeZone: input.timeZone,
        },
      },
    });

    return mapEventResponse(created.data);
  } catch (error) {
    throw mapGoogleApiError(error, calendarId);
  }
}

export async function updateGoogleCalendarEvent(
  eventId: string,
  input: UpdateGoogleCalendarEventInput,
) {
  const calendar = getCalendarClient();
  const calendarId = getCalendarId();

  try {
    const updated = await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: {
        summary: input.summary,
        description: input.description,
        location: input.location,
        ...(input.start
          ? {
              start: {
                dateTime: input.start,
                timeZone: input.timeZone,
              },
            }
          : {}),
        ...(input.end
          ? {
              end: {
                dateTime: input.end,
                timeZone: input.timeZone,
              },
            }
          : {}),
      },
    });

    return mapEventResponse(updated.data);
  } catch (error) {
    throw mapGoogleApiError(error, calendarId);
  }
}

export async function deleteGoogleCalendarEvent(eventId: string) {
  const calendar = getCalendarClient();
  const calendarId = getCalendarId();

  try {
    await calendar.events.delete({
      calendarId,
      eventId,
    });
  } catch (error) {
    throw mapGoogleApiError(error, calendarId);
  }

  return { id: eventId, deleted: true };
}