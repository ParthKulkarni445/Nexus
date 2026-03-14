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
import { headers } from "next/headers";

const updateStatusSchema = z.object({
  status: z.enum([
    "not_contacted",
    "contacted",
    "positive",
    "accepted",
    "rejected",
  ]),
  note: z.string().optional(),
});

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
    const currentCycle = await db.companySeasonCycle.findUnique({
      where: { id: cycleId },
    });

    if (!currentCycle) {
      return notFound("Company season cycle not found");
    }

    const updatedCycle = await db.$transaction(async (tx) => {
      await tx.companySeasonStatusHistory.create({
        data: {
          companySeasonCycleId: cycleId,
          fromStatus: currentCycle.status,
          toStatus: validation.status,
          changedBy: user.id,
          changeNote: validation.note,
        },
      });

      return tx.companySeasonCycle.update({
        where: { id: cycleId },
        data: {
          status: validation.status,
          updatedBy: user.id,
          updatedField: "status",
          updatedAt: new Date(),
        },
      });
    });

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
