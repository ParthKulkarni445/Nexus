import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
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
import { companyAssignments, companyAssignmentHistory } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

const reassignSchema = z.object({
  newAssigneeUserId: z.string().uuid(),
  reason: z.string().min(1),
});

/**
 * PUT /api/v1/assignments/:assignmentId/reassign
 * Reassign ownership with reason
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
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
    // Get current assignment
    const currentAssignment = await db.query.companyAssignments.findFirst({
      where: eq(companyAssignments.id, assignmentId),
    });

    if (!currentAssignment) {
      return notFound("Assignment not found");
    }

    // Create history entry
    await db.insert(companyAssignmentHistory).values({
      assignmentId,
      fromUserId: currentAssignment.assigneeUserId,
      toUserId: validation.newAssigneeUserId,
      changedBy: user.id,
      reason: validation.reason,
    });

    // Update assignment
    const [updatedAssignment] = await db
      .update(companyAssignments)
      .set({
        assigneeUserId: validation.newAssigneeUserId,
        assignedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(companyAssignments.id, assignmentId))
      .returning();

    // Create audit log
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
  } catch (error) {
    console.error("Error reassigning:", error);
    return serverError();
  }
}
