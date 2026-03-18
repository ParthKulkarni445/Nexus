import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  serverError,
} from "@/lib/api/response";
import { validateBody } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { headers } from "next/headers";

const createDriveSchema = z.object({
  companyId: z.string().uuid(),
  companySeasonCycleId: z.string().uuid(),
  title: z.string().min(1).max(255),
  stage: z.enum(["oa", "interview", "hr", "final", "other"]),
  status: z.enum(["tentative", "confirmed", "completed", "cancelled"]),
  venue: z.string().max(255).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const stage = searchParams.get("stage");
  const seasonId = searchParams.get("seasonId");
  const companyId = searchParams.get("companyId");
  const ownerUserId = searchParams.get("ownerUserId");

  try {
    const where: Prisma.DriveWhereInput = {
      ...(from || to
        ? {
            startAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
      ...(status ? { status: status as never } : {}),
      ...(stage ? { stage } : {}),
      ...(companyId ? { companyId } : {}),
      ...((seasonId || ownerUserId)
        ? {
            companySeasonCycle: {
              ...(seasonId ? { seasonId } : {}),
              ...(ownerUserId ? { ownerUserId } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              {
                company: {
                  name: { contains: search, mode: "insensitive" },
                },
              },
              { venue: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const drivesList = await db.drive.findMany({
      where,
      orderBy: { startAt: "desc" },
      take: 100,
      include: {
        company: { select: { id: true, name: true, industry: true } },
        companySeasonCycle: {
          select: {
            season: { select: { name: true, seasonType: true } },
          },
        },
        creator: { select: { id: true, name: true } },
      },
    });

    return success(drivesList);
  } catch (error) {
    console.error("Error fetching drives:", error);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions to create drives");
  }

  const validation = await validateBody(request, createDriveSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    let isConflictFlagged = false;

    if (validation.venue && validation.startAt && validation.endAt) {
      const conflicts = await db.drive.findMany({
        where: {
          venue: validation.venue,
          startAt: { gte: new Date(validation.startAt) },
          endAt: { lte: new Date(validation.endAt) },
        },
        select: { id: true },
      });

      isConflictFlagged = conflicts.length > 0;
    }

    const drive = await db.drive.create({
      data: {
        ...validation,
        startAt: validation.startAt ? new Date(validation.startAt) : null,
        endAt: validation.endAt ? new Date(validation.endAt) : null,
        isConflictFlagged,
        createdBy: user.id,
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "create_drive",
      targetType: "drive",
      targetId: drive.id,
      meta: { title: drive.title, isConflictFlagged },
      ...clientInfo,
    });

    return success(drive);
  } catch (error) {
    console.error("Error creating drive:", error);
    return serverError();
  }
}
