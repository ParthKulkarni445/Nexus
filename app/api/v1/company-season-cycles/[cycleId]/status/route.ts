import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasRoleOrCoordinatorType } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from "@/lib/api/response";
import { validateBody } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import {
  companySeasonCycles,
  companySeasonStatusHistory,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

const updateStatusSchema = z.object({
  status: z.enum(["not_contacted", "contacted", "positive", "accepted", "rejected"]),
  note: z.string().optional(),
});

/**
 * PUT /api/v1/company-season-cycles/:cycleId/status
 * Transition status with note
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ cycleId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRoleOrCoordinatorType(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions");
  }

  const { cycleId } = await params;
  const validation = await validateBody(request, updateStatusSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    // Get current cycle
    const currentCycle = await db.query.companySeasonCycles.findFirst({
      where: eq(companySeasonCycles.id, cycleId),
    });

    if (!currentCycle) {
      return notFound("Company season cycle not found");
    }

    // Create status history entry
    await db.insert(companySeasonStatusHistory).values({
      companySeasonCycleId: cycleId,
      fromStatus: currentCycle.status,
      toStatus: validation.status,
      changedBy: user.id,
      changeNote: validation.note,
    });

    // Update cycle status
    const [updatedCycle] = await db
      .update(companySeasonCycles)
      .set({
        status: validation.status,
        updatedAt: new Date(),
      })
      .where(eq(companySeasonCycles.id, cycleId))
      .returning();

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: "update_cycle_status",
      targetType: "company_season_cycle",
      targetId: cycleId,
      meta: {
        from: currentCycle.status,
        to: validation.status,
        note: validation.note,
      },
      ...clientInfo,
    });

    return success(updatedCycle);
  } catch (error) {
    console.error("Error updating cycle status:", error);
    return serverError();
  }
}
