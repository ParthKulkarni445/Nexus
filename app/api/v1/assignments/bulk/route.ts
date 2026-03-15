import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasRoleOrCoordinatorType } from "@/lib/api/auth";
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

const bulkAssignmentSchema = z.object({
  assignments: z.array(
    z.object({
      itemType: z.enum(["company", "contact"]),
      itemId: z.string().trim().min(1),
      assigneeUserId: z.string().trim().min(1),
      notes: z.string().optional(),
    })
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
    const createdAssignments = await db.$transaction(
      validation.assignments.map((assignment) =>
        db.companyAssignment.create({
          data: {
            ...assignment,
            assignedBy: user.id,
          },
        })
      )
    );

    await createAuditLog({
      actorId: user.id,
      action: "bulk_create_assignments",
      targetType: "assignment",
      meta: { count: createdAssignments.length },
      ...clientInfo,
    });

    return success({
      message: `${createdAssignments.length} assignments created successfully`,
      assignments: createdAssignments,
    });
  } catch (error) {
    console.error("Error creating bulk assignments:", error);
    return serverError();
  }
}
