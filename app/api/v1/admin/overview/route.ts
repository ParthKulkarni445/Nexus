import { NextRequest } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import { success, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { db } from "@/lib/db";

/**
 * GET /api/v1/admin/overview
 * Returns high-level admin dashboard metrics.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin"])) {
    return forbidden("Only administrators can access admin dashboard data");
  }

  try {
    const [
      users,
      seasons,
      activeSeasons,
      schedules,
      recentSchedules,
      recentAuditLogs,
      permissionCount,
    ] = await Promise.all([
      db.user.groupBy({ by: ["role"], _count: { _all: true } }),
      db.recruitmentSeason.count(),
      db.recruitmentSeason.findMany({
        where: { isActive: true },
        orderBy: [{ academicYear: "desc" }, { createdAt: "desc" }],
        select: { id: true, name: true, seasonType: true, academicYear: true },
      }),
      db.schedule.count(),
      db.schedule.findMany({
        orderBy: { startTime: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          status: true,
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      db.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          action: true,
          targetType: true,
          targetId: true,
          createdAt: true,
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      db.userPermission.count(),
    ]);

    const roleCounts = users.reduce<Record<string, number>>((acc, row) => {
      acc[row.role] = row._count._all;
      return acc;
    }, {});

    return success({
      totals: {
        totalUsers: Object.values(roleCounts).reduce((sum, value) => sum + value, 0),
        admins: roleCounts.tpo_admin ?? 0,
        coordinators: roleCounts.coordinator ?? 0,
        students: roleCounts.student ?? 0,
        seasons,
        activeSeasons: activeSeasons.length,
        schedules,
        customPermissionOverrides: permissionCount,
      },
      activeSeasons,
      recentSchedules,
      recentAuditLogs,
    });
  } catch (error) {
    console.error("Error fetching admin overview:", error);
    return serverError();
  }
}
