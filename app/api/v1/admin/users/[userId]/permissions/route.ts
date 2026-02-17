import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import { success, unauthorized, forbidden, badRequest } from "@/lib/api/response";
import { validateBody } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { userPermissions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";

const updatePermissionsSchema = z.object({
  permissions: z.array(
    z.object({
      key: z.string(),
      allowed: z.boolean(),
    })
  ),
});

/**
 * PUT /api/v1/admin/users/:userId/permissions
 * Grant/revoke granular permissions
 */
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

  // Update permissions
  for (const perm of validation.permissions) {
    // Check if permission exists
    const existing = await db.query.userPermissions.findFirst({
      where: and(
        eq(userPermissions.userId, userId),
        eq(userPermissions.permissionKey, perm.key)
      ),
    });

    if (existing) {
      // Update existing permission
      await db
        .update(userPermissions)
        .set({
          isAllowed: perm.allowed,
          grantedBy: user.id,
          grantedAt: new Date(),
        })
        .where(eq(userPermissions.id, existing.id));
    } else {
      // Create new permission
      await db.insert(userPermissions).values({
        userId,
        permissionKey: perm.key,
        isAllowed: perm.allowed,
        grantedBy: user.id,
      });
    }
  }

  // Create audit log
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
