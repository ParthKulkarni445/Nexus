import { NextRequest } from "next/server";
import { ScheduleStatus } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import {
  badRequest,
  forbidden,
  notFound,
  serverError,
  success,
  unauthorized,
} from "@/lib/api/response";
import { validateBody } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import {
  cancelSchedule,
  ScheduleError,
  updateSchedule,
} from "@/services/scheduleService";
import { headers } from "next/headers";

const scheduleStatusValues = Object.values(ScheduleStatus) as [
  ScheduleStatus,
  ...ScheduleStatus[],
];

const updateScheduleSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  status: z.enum(scheduleStatusValues).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions to update schedules");
  }

  const validation = await validateBody(request, updateScheduleSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const { id } = await params;
  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const updated = await updateSchedule(
      id,
      {
        title: validation.title,
        description: validation.description,
        startTime: validation.startTime ? new Date(validation.startTime) : undefined,
        endTime: validation.endTime ? new Date(validation.endTime) : undefined,
        status: validation.status,
      },
      user.id,
    );

    await createAuditLog({
      actorId: user.id,
      action: "update_schedule",
      targetType: "schedule",
      targetId: id,
      meta: {
        status: updated.status,
        startTime: updated.startTime.toISOString(),
        endTime: updated.endTime.toISOString(),
      },
      ...clientInfo,
    });

    return success(updated);
  } catch (error) {
    if (error instanceof ScheduleError) {
      if (error.code === "NOT_FOUND") {
        return notFound(error.message);
      }
      return badRequest(error.message);
    }

    console.error("Error updating schedule:", error);
    return serverError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions to cancel schedules");
  }

  const { id } = await params;
  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const cancelled = await cancelSchedule(id, user.id);

    await createAuditLog({
      actorId: user.id,
      action: "cancel_schedule",
      targetType: "schedule",
      targetId: id,
      meta: {
        status: cancelled.status,
      },
      ...clientInfo,
    });

    return success(cancelled);
  } catch (error) {
    if (error instanceof ScheduleError) {
      if (error.code === "NOT_FOUND") {
        return notFound(error.message);
      }
      return badRequest(error.message);
    }

    console.error("Error cancelling schedule:", error);
    return serverError();
  }
}
