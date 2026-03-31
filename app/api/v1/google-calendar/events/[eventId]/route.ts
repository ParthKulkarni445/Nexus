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
  deleteGoogleCalendarEvent,
  GoogleCalendarApiError,
  GoogleCalendarConfigError,
  updateGoogleCalendarEvent,
} from "@/lib/google/calendar";

const updateEventSchema = z
  .object({
    summary: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
    timeZone: z.string().optional(),
  })
  .refine(
    (value) => {
      if (!value.start || !value.end) {
        return true;
      }
      return new Date(value.start) < new Date(value.end);
    },
    {
      message: "Event end time must be after start time",
      path: ["end"],
    },
  );

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions to update calendar events");
  }

  const validation = await validateBody(request, updateEventSchema);

  if (validation instanceof Response) {
    return validation;
  }

  if (Object.keys(validation).length === 0) {
    return badRequest("No update fields were provided");
  }

  const { eventId } = await params;

  try {
    const updated = await updateGoogleCalendarEvent(eventId, validation);
    return success(updated);
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

    console.error("Error updating Google Calendar event:", error);
    return serverError();
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions to delete calendar events");
  }

  const { eventId } = await params;

  try {
    const result = await deleteGoogleCalendarEvent(eventId);
    return success(result);
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

    console.error("Error deleting Google Calendar event:", error);
    return serverError();
  }
}