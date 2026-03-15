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
import { validateBody } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { headers } from "next/headers";

const reassignSchema = z.object({
  newAssigneeUserId: z.string().trim().min(1),
  reason: z.string().min(1),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
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
    const currentAssignment = await db.companyAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!currentAssignment) {
      return notFound("Assignment not found");
    }

    const updatedAssignment = await db.$transaction(async (tx) => {
      await tx.companyAssignmentHistory.create({
        data: {
          assignmentId,
          fromUserId: currentAssignment.assigneeUserId,
          toUserId: validation.newAssigneeUserId,
          changedBy: user.id,
          reason: validation.reason,
        },
      });

      return tx.companyAssignment.update({
        where: { id: assignmentId },
        data: {
          assigneeUserId: validation.newAssigneeUserId,
          assignedBy: user.id,
          updatedAt: new Date(),
        },
      });
    });

    await createAuditLog({
      actorId: user.id,
      action: "reassign_assignment",
      targetType: "assignment",
      targetId: assignmentId,
      meta: {
        from: currentAssignment.assigneeUserId,
        to: validation.newAssigneeUserId,
        reason: validation.reason,
      },
      ...clientInfo,
    });

    return success(updatedAssignment);
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return notFound("Assignment not found");
    }

    console.error("Error reassigning:", error);
    return serverError();
  }
}
