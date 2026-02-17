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
import { companyAssignments, companyAssignmentHistory } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

const createAssignmentSchema = z.object({
  itemType: z.enum(["company", "contact"]),
  itemId: z.string().uuid(),
  assigneeUserId: z.string().uuid(),
  assignmentRole: z.enum(["primary", "secondary"]),
  notes: z.string().optional(),
});

const bulkAssignmentSchema = z.object({
  assignments: z.array(
    z.object({
      itemType: z.enum(["company", "contact"]),
      itemId: z.string().uuid(),
      assigneeUserId: z.string().uuid(),
      assignmentRole: z.enum(["primary", "secondary"]),
      notes: z.string().optional(),
    })
  ),
});

const reassignSchema = z.object({
  newAssigneeUserId: z.string().uuid(),
  reason: z.string().min(1),
});

/**
 * POST /api/v1/assignments
 * Assign a company/contact to user with primary/secondary flag
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions to create assignments");
  }

  const validation = await validateBody(request, createAssignmentSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const [assignment] = await db
      .insert(companyAssignments)
      .values({
        ...validation,
        assignedBy: user.id,
      })
      .returning();

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: "create_assignment",
      targetType: "assignment",
      targetId: assignment.id,
      meta: validation,
      ...clientInfo,
    });

    return success(assignment);
  } catch (error) {
    console.error("Error creating assignment:", error);
    return serverError();
  }
}
