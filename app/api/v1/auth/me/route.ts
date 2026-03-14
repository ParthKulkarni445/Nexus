import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { success, unauthorized } from "@/lib/api/response";
import { db } from "@/lib/db";

/**
 * GET /api/v1/auth/me
 * Returns current user profile + effective permissions
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  // Fetch user's custom permissions
  const permissions = await db.userPermission.findMany({
    where: { userId: user.id },
  });

  return success({
    user,
    permissions: permissions.map((p) => ({
      key: p.permissionKey,
      allowed: p.isAllowed,
      grantedAt: p.grantedAt,
    })),
  });
}
