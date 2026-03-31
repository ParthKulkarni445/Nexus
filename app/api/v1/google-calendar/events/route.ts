import { z } from "zod";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import {
  badRequest,
  forbidden,
  serverError,
  success,
  unauthorized,
} from "@/lib/api/response";
import { validateBody } from "@/lib/api/validation";
import {
  createGoogleCalendarEvent,
  GoogleCalendarApiError,
  GoogleCalendarConfigError,
} from "@/lib/google/calendar";

const createEventSchema = z.object({
  summary: z.string().min(1).max(255),
  description: z.string().optional(),
  location: z.string().optional(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  timeZone: z.string().optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions to create calendar events");
  }

  const validation = await validateBody(request, createEventSchema);

  if (validation instanceof Response) {
    return validation;
  }

  if (new Date(validation.start) >= new Date(validation.end)) {
    return badRequest("Event end time must be after start time");
  }

  try {
    const created = await createGoogleCalendarEvent(validation);
    return success(created);
  } catch (error) {
    if (error instanceof GoogleCalendarConfigError) {
      return badRequest(error.message);
    }

    if (error instanceof GoogleCalendarApiError) {
      if (error.status === 401) {
        return unauthorized(error.message);
      }
      if (error.status === 403) {
        return forbidden(error.message);
      }
      return badRequest(error.message);
    }

    console.error("Error creating Google Calendar event:", error);
    return serverError();
  }
}