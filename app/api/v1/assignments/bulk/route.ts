import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasRoleOrCoordinatorType } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  serverError,
} from "@/lib/api/response";
import { uuidLikeSchema, validateBody } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { headers } from "next/headers";

const bulkAssignmentSchema = z.object({
  assignments: z.array(
    z.object({
      companySeasonCycleId: uuidLikeSchema,
      assigneeUserId: uuidLikeSchema,
      notes: z.string().optional(),
    }),
  ),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (
    !hasRoleOrCoordinatorType(user, ["tpo_admin"], ["student_representative"])
  ) {
    return forbidden("Insufficient permissions to create assignments");
  }

  const validation = await validateBody(request, bulkAssignmentSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const updatedCycles = await db.$transaction(
      validation.assignments.map((assignment) =>
        db.companySeasonCycle.update({
          where: { id: assignment.companySeasonCycleId },
          data: {
            ownerUserId: assignment.assigneeUserId,
            updatedBy: user.id,
            updatedField: "owner_user_id",
            updatedAt: new Date(),
          },
        }),
      ),
    );

    await createAuditLog({
      actorId: user.id,
      action: "bulk_assign_company_season_cycles",
      targetType: "company_season_cycle",
      meta: { count: updatedCycles.length },
      ...clientInfo,
    });

    return success({
      message: `${updatedCycles.length} season cycles assigned successfully`,
      cycles: updatedCycles,
    });
  } catch (error) {
    console.error("Error creating bulk assignments:", error);
    return serverError();
  }
}
