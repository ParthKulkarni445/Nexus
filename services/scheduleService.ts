import { Prisma, ScheduleStatus } from "@prisma/client";
import { db } from "@/lib/db";

export type ListScheduleFilters = {
  companyId?: string;
  status?: ScheduleStatus;
  from?: Date;
  to?: Date;
  search?: string;
};

export type CreateScheduleInput = {
  companyId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
};

export type UpdateScheduleInput = {
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  status?: ScheduleStatus;
};

export class ScheduleError extends Error {
  code: "BAD_REQUEST" | "NOT_FOUND";

  constructor(code: "BAD_REQUEST" | "NOT_FOUND", message: string) {
    super(message);
    this.code = code;
  }
}

function ensureValidTimeRange(startTime: Date, endTime: Date) {
  if (!(startTime instanceof Date) || Number.isNaN(startTime.getTime())) {
    throw new ScheduleError("BAD_REQUEST", "Invalid start time");
  }

  if (!(endTime instanceof Date) || Number.isNaN(endTime.getTime())) {
    throw new ScheduleError("BAD_REQUEST", "Invalid end time");
  }

  if (startTime >= endTime) {
    throw new ScheduleError("BAD_REQUEST", "startTime must be before endTime");
  }
}

function ensureStatusTransition(
  current: ScheduleStatus,
  next: ScheduleStatus,
): void {
  const allowedTransitions: Record<ScheduleStatus, ScheduleStatus[]> = {
    scheduled: ["scheduled", "rescheduled", "cancelled"],
    rescheduled: ["rescheduled", "cancelled"],
    cancelled: ["cancelled"],
  };

  if (!allowedTransitions[current].includes(next)) {
    throw new ScheduleError(
      "BAD_REQUEST",
      `Cannot change status from ${current} to ${next}`,
    );
  }
}

async function ensureNoOverlappingSchedule(
  companyId: string,
  startTime: Date,
  endTime: Date,
  excludeId?: string,
) {
  const overlap = await db.schedule.findFirst({
    where: {
      companyId,
      status: { not: "cancelled" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
    },
    select: { id: true },
  });

  if (overlap) {
    throw new ScheduleError(
      "BAD_REQUEST",
      "A schedule overlaps with an existing event for this company",
    );
  }
}

async function notifyStudents(
  title: string,
  body: string,
  payload: Prisma.InputJsonValue,
) {
  const students = await db.user.findMany({
    where: { role: "student", isActive: true },
    select: { id: true },
  });

  if (students.length === 0) {
    return;
  }

  await db.notification.createMany({
    data: students.map((student) => ({
      userId: student.id,
      type: "schedule",
      title,
      body,
      payload,
    })),
  });
}

export async function listSchedules(filters: ListScheduleFilters) {
  const where: Prisma.ScheduleWhereInput = {
    ...(filters.companyId ? { companyId: filters.companyId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.from || filters.to
      ? {
          startTime: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" } },
            { description: { contains: filters.search, mode: "insensitive" } },
            {
              company: {
                name: { contains: filters.search, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
  };

  return db.schedule.findMany({
    where,
    include: {
      company: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
      updater: { select: { id: true, name: true } },
    },
    orderBy: { startTime: "asc" },
    take: 300,
  });
}

export async function listUpcomingSchedules() {
  return db.schedule.findMany({
    where: {
      startTime: { gte: new Date() },
      status: { not: "cancelled" },
    },
    include: {
      company: { select: { id: true, name: true } },
    },
    orderBy: { startTime: "asc" },
    take: 300,
  });
}

export async function createSchedule(input: CreateScheduleInput, actorId: string) {
  ensureValidTimeRange(input.startTime, input.endTime);
  await ensureNoOverlappingSchedule(input.companyId, input.startTime, input.endTime);

  const created = await db.schedule.create({
    data: {
      companyId: input.companyId,
      title: input.title,
      description: input.description,
      startTime: input.startTime,
      endTime: input.endTime,
      status: "scheduled",
      createdBy: actorId,
      updatedBy: actorId,
    },
    include: {
      company: { select: { id: true, name: true } },
    },
  });

  await notifyStudents(
    "New Schedule Added",
    `${created.company.name}: ${created.title}`,
    {
      scheduleId: created.id,
      companyId: created.companyId,
      status: created.status,
      startTime: created.startTime.toISOString(),
      endTime: created.endTime.toISOString(),
    },
  );

  return created;
}

export async function updateSchedule(
  scheduleId: string,
  input: UpdateScheduleInput,
  actorId: string,
) {
  const existing = await db.schedule.findUnique({
    where: { id: scheduleId },
    include: { company: { select: { id: true, name: true } } },
  });

  if (!existing) {
    throw new ScheduleError("NOT_FOUND", "Schedule not found");
  }

  const nextStart = input.startTime ?? existing.startTime;
  const nextEnd = input.endTime ?? existing.endTime;
  ensureValidTimeRange(nextStart, nextEnd);

  if (existing.status === "cancelled") {
    throw new ScheduleError(
      "BAD_REQUEST",
      "Cancelled schedules cannot be modified",
    );
  }

  await ensureNoOverlappingSchedule(existing.companyId, nextStart, nextEnd, existing.id);

  const wasTimingChanged =
    (input.startTime && input.startTime.getTime() !== existing.startTime.getTime()) ||
    (input.endTime && input.endTime.getTime() !== existing.endTime.getTime());

  const nextStatus = input.status ?? (wasTimingChanged ? "rescheduled" : existing.status);
  ensureStatusTransition(existing.status, nextStatus);

  const updated = await db.schedule.update({
    where: { id: scheduleId },
    data: {
      title: input.title,
      description: input.description,
      startTime: input.startTime,
      endTime: input.endTime,
      status: nextStatus,
      updatedBy: actorId,
      updatedAt: new Date(),
    },
    include: {
      company: { select: { id: true, name: true } },
    },
  });

  await notifyStudents(
    updated.status === "rescheduled" ? "Schedule Rescheduled" : "Schedule Updated",
    `${updated.company.name}: ${updated.title}`,
    {
      scheduleId: updated.id,
      companyId: updated.companyId,
      status: updated.status,
      startTime: updated.startTime.toISOString(),
      endTime: updated.endTime.toISOString(),
    },
  );

  return updated;
}

export async function cancelSchedule(scheduleId: string, actorId: string) {
  const existing = await db.schedule.findUnique({
    where: { id: scheduleId },
    include: { company: { select: { id: true, name: true } } },
  });

  if (!existing) {
    throw new ScheduleError("NOT_FOUND", "Schedule not found");
  }

  if (existing.status !== "cancelled") {
    ensureStatusTransition(existing.status, "cancelled");
  }

  const cancelled = await db.schedule.update({
    where: { id: scheduleId },
    data: {
      status: "cancelled",
      updatedBy: actorId,
      updatedAt: new Date(),
    },
    include: {
      company: { select: { id: true, name: true } },
    },
  });

  await notifyStudents(
    "Schedule Cancelled",
    `${cancelled.company.name}: ${cancelled.title}`,
    {
      scheduleId: cancelled.id,
      companyId: cancelled.companyId,
      status: cancelled.status,
      startTime: cancelled.startTime.toISOString(),
      endTime: cancelled.endTime.toISOString(),
    },
  );

  return cancelled;
}
