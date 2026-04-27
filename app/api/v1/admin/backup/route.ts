import { NextRequest } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import { success, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { headers } from "next/headers";

/**
 * GET /api/v1/admin/backup
 * Returns a compact JSON backup payload for critical admin entities.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin"])) {
    return forbidden("Only administrators can generate backups");
  }

  try {
    const [users, seasons, permissions] = await Promise.all([
      db.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          coordinatorType: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.recruitmentSeason.findMany({
        select: {
          id: true,
          name: true,
          seasonType: true,
          academicYear: true,
          startDate: true,
          endDate: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.userPermission.findMany({
        select: {
          id: true,
          userId: true,
          permissionKey: true,
          isAllowed: true,
          grantedBy: true,
          grantedAt: true,
        },
      }),
    ]);

    const backup = {
      generatedAt: new Date().toISOString(),
      generatedBy: {
        id: user.id,
        email: user.email,
      },
      counts: {
        users: users.length,
        seasons: seasons.length,
        permissions: permissions.length,
      },
      payload: {
        users,
        seasons,
        permissions,
      },
    };

    const headersList = await headers();
    const clientInfo = getClientInfo(headersList);

    await createAuditLog({
      actorId: user.id,
      action: "generate_admin_backup",
      targetType: "backup",
      meta: {
        users: users.length,
        seasons: seasons.length,
        permissions: permissions.length,
      },
      ...clientInfo,
    });

    return success(backup);
  } catch (error) {
    console.error("Error generating backup:", error);
    return serverError();
  }
}
