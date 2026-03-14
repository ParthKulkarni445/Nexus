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
import { headers } from "next/headers";

const createAssignmentSchema = z.object({
  itemType: z.enum(["company", "contact"]),
  itemId: z.string().uuid(),
  assigneeUserId: z.string().uuid(),
  notes: z.string().optional(),
});

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
    const assignment = await db.companyAssignment.create({
      data: {
        ...validation,
        assignedBy: user.id,
      },
    });

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
