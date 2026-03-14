import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
} from "@/lib/api/response";
import { validateBody } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { headers } from "next/headers";

const updatePermissionsSchema = z.object({
  permissions: z.array(
    z.object({
      key: z.string(),
      allowed: z.boolean(),
    })
  ),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin"])) {
    return forbidden("Only administrators can manage permissions");
  }

  const { userId } = await params;
  const validation = await validateBody(request, updatePermissionsSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  for (const perm of validation.permissions) {
    const existing = await db.userPermission.findFirst({
      where: {
        userId,
        permissionKey: perm.key,
      },
    });

    if (existing) {
      await db.userPermission.update({
        where: { id: existing.id },
        data: {
          isAllowed: perm.allowed,
          grantedBy: user.id,
          grantedAt: new Date(),
        },
      });
    } else {
      await db.userPermission.create({
        data: {
          userId,
          permissionKey: perm.key,
          isAllowed: perm.allowed,
          grantedBy: user.id,
        },
      });
    }
  }

  await createAuditLog({
    actorId: user.id,
    action: "update_user_permissions",
    targetType: "user",
    targetId: userId,
    meta: { permissions: validation.permissions },
    ...clientInfo,
  });

  return success({ message: "Permissions updated successfully" });
}
