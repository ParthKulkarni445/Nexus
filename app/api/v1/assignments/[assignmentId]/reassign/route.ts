import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser, hasRoleOrCoordinatorType } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from "@/lib/api/response";
import { uuidLikeSchema, validateBody } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { headers } from "next/headers";

const reassignSchema = z.object({
  newAssigneeUserId: uuidLikeSchema,
  reason: z.string().min(1),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (
    !hasRoleOrCoordinatorType(user, ["tpo_admin"], ["student_representative"])
  ) {
    return forbidden("Insufficient permissions to reassign");
  }

  const { assignmentId } = await params;
  const validation = await validateBody(request, reassignSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const currentCycle = await db.companySeasonCycle.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        ownerUserId: true,
      },
    });

    if (!currentCycle) {
      return notFound("Company season cycle not found");
    }

    const updatedCycle = await db.companySeasonCycle.update({
      where: { id: assignmentId },
      data: {
        ownerUserId: validation.newAssigneeUserId,
        updatedBy: user.id,
        updatedField: "owner_user_id",
        updatedAt: new Date(),
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "reassign_company_season_cycle",
      targetType: "company_season_cycle",
      targetId: assignmentId,
      meta: {
        from: currentCycle.ownerUserId,
        to: validation.newAssigneeUserId,
        reason: validation.reason,
      },
      ...clientInfo,
    });

    return success(updatedCycle);
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return notFound("Company season cycle not found");
    }

    console.error("Error reassigning:", error);
    return serverError();
  }
}
