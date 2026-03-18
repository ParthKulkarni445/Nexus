import { NextRequest } from "next/server";
import { ScheduleStatus } from "@prisma/client";
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
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import {
  createSchedule,
  listSchedules,
  ScheduleError,
} from "@/services/scheduleService";
import { headers } from "next/headers";

const createScheduleSchema = z.object({
  companyId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

const scheduleStatusValues = Object.values(ScheduleStatus) as [
  ScheduleStatus,
  ...ScheduleStatus[],
];

const listSchedulesSchema = z.object({
  companyId: z.string().uuid().optional(),
  status: z.enum(scheduleStatusValues).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  search: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const parsed = listSchedulesSchema.safeParse({
    companyId: request.nextUrl.searchParams.get("companyId") || undefined,
    status: request.nextUrl.searchParams.get("status") || undefined,
    from: request.nextUrl.searchParams.get("from") || undefined,
    to: request.nextUrl.searchParams.get("to") || undefined,
    search: request.nextUrl.searchParams.get("search") || undefined,
  });

  if (!parsed.success) {
    return badRequest("Invalid query parameters", parsed.error.issues);
  }

  try {
    const events = await listSchedules({
      companyId: parsed.data.companyId,
      status: parsed.data.status,
      from: parsed.data.from ? new Date(parsed.data.from) : undefined,
      to: parsed.data.to ? new Date(parsed.data.to) : undefined,
      search: parsed.data.search,
    });

    return success(events);
  } catch (error) {
    if (error instanceof ScheduleError) {
      return badRequest(error.message);
    }

    console.error("Error listing schedules:", error);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions to create schedules");
  }

  const validation = await validateBody(request, createScheduleSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const created = await createSchedule(
      {
        companyId: validation.companyId,
        title: validation.title,
        description: validation.description,
        startTime: new Date(validation.startTime),
        endTime: new Date(validation.endTime),
      },
      user.id,
    );

    await createAuditLog({
      actorId: user.id,
      action: "create_schedule",
      targetType: "schedule",
      targetId: created.id,
      meta: {
        companyId: created.companyId,
        title: created.title,
        status: created.status,
      },
      ...clientInfo,
    });

    return success(created);
  } catch (error) {
    if (error instanceof ScheduleError) {
      return badRequest(error.message);
    }

    console.error("Error creating schedule:", error);
    return serverError();
  }
}
