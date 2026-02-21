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
import { companyAssignments } from "@/lib/db/schema";
import { headers } from "next/headers";

const bulkAssignmentSchema = z.object({
  assignments: z.array(
    z.object({
      itemType: z.enum(["company", "contact"]),
      itemId: z.string().uuid(),
      assigneeUserId: z.string().uuid(),
      notes: z.string().optional(),
    })
  ),
});

/**
 * POST /api/v1/assignments/bulk
 * Bulk assign multiple companies/contacts
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions to create assignments");
  }

  const validation = await validateBody(request, bulkAssignmentSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const assignmentValues = validation.assignments.map((a) => ({
      ...a,
      assignedBy: user.id,
    }));

    const createdAssignments = await db
      .insert(companyAssignments)
      .values(assignmentValues)
      .returning();

    // Create audit log
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
