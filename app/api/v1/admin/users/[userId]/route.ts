import { NextRequest } from "next/server";
import { UserRole, CoordinatorType } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  badRequest,
  serverError,
} from "@/lib/api/response";
import { validateBody } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { headers } from "next/headers";

const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  role: z.nativeEnum(UserRole).optional(),
  coordinatorType: z.nativeEnum(CoordinatorType).nullable().optional(),
  isActive: z.boolean().optional(),
});

function validateCoordinatorType(
  role: UserRole,
  coordinatorType: CoordinatorType | null,
): string | null {
  if (role === UserRole.coordinator && !coordinatorType) {
    return "Coordinator type is required for coordinator users";
  }

  if (role !== UserRole.coordinator && coordinatorType) {
    return "Coordinator type can only be set for coordinator users";
  }

  return null;
}

/**
 * PATCH /api/v1/admin/users/:userId
 * Updates user account metadata and status.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return unauthorized();
  }

  if (!hasRole(currentUser, ["tpo_admin"])) {
    return forbidden("Only administrators can edit users");
  }

  const validation = await validateBody(request, updateUserSchema);
  if (validation instanceof Response) {
    return validation;
  }

  const { userId } = await params;

  try {
    const existing = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        coordinatorType: true,
        isActive: true,
      },
    });

    if (!existing) {
      return badRequest("User not found");
    }

    if (existing.id === currentUser.id && validation.isActive === false) {
      return badRequest("You cannot deactivate your own account");
    }

    const nextRole = validation.role ?? existing.role;
    const nextCoordinatorType =
      validation.coordinatorType === undefined
        ? existing.coordinatorType
        : validation.coordinatorType;

    const coordinatorTypeError = validateCoordinatorType(
      nextRole,
      nextCoordinatorType,
    );

    if (coordinatorTypeError) {
      return badRequest(coordinatorTypeError);
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: {
        name: validation.name,
        phone: validation.phone,
        role: validation.role,
        coordinatorType:
          nextRole === UserRole.coordinator ? nextCoordinatorType : null,
        isActive: validation.isActive,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        coordinatorType: true,
        isActive: true,
        createdAt: true,
      },
    });

    const headersList = await headers();
    const clientInfo = getClientInfo(headersList);

    await createAuditLog({
      actorId: currentUser.id,
      action: "update_user_account",
      targetType: "user",
      targetId: userId,
      meta: {
        before: {
          name: existing.name,
          role: existing.role,
          coordinatorType: existing.coordinatorType,
          isActive: existing.isActive,
        },
        after: {
          name: updated.name,
          role: updated.role,
          coordinatorType: updated.coordinatorType,
          isActive: updated.isActive,
        },
      },
      ...clientInfo,
    });

    return success(updated);
  } catch (error) {
    console.error("Error updating user:", error);
    return serverError();
  }
}
