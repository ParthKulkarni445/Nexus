import { NextRequest } from "next/server";
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
import { drives } from "@/lib/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
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

/**
 * GET /api/v1/drives
 * Calendar feed with filtering
 * Query params: from, to, status, seasonId
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = searchParams.get("status");
  const seasonId = searchParams.get("seasonId");

  try {
    const conditions = [];

    if (from) {
      conditions.push(gte(drives.startAt, new Date(from)));
    }

    if (to) {
      conditions.push(lte(drives.startAt, new Date(to)));
    }

    if (status) {
      conditions.push(eq(drives.status, status as any));
    }

    const drivesList = await db
      .select()
      .from(drives)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(drives.startAt))
      .limit(100);

    return success(drivesList);
  } catch (error) {
    console.error("Error fetching drives:", error);
    return serverError();
  }
}

/**
 * POST /api/v1/drives
 * Create tentative/confirmed drive with conflict checks
 */
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
    // Check for conflicts if venue and time are specified
    let isConflictFlagged = false;
    if (validation.venue && validation.startAt && validation.endAt) {
      const conflicts = await db
        .select()
        .from(drives)
        .where(
          and(
            eq(drives.venue, validation.venue),
            gte(drives.startAt, new Date(validation.startAt)),
            lte(drives.endAt, new Date(validation.endAt))
          )
        );

      if (conflicts.length > 0) {
        isConflictFlagged = true;
      }
    }

    const [drive] = await db
      .insert(drives)
      .values({
        ...validation,
        startAt: validation.startAt ? new Date(validation.startAt) : null,
        endAt: validation.endAt ? new Date(validation.endAt) : null,
        isConflictFlagged,
        createdBy: user.id,
      })
      .returning();

    // Create audit log
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
