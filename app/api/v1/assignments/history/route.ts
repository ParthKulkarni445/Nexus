import { NextRequest } from "next/server";
import { getCurrentUser, hasRoleOrCoordinatorType } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  serverError,
} from "@/lib/api/response";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (
    !hasRoleOrCoordinatorType(user, ["tpo_admin"], ["student_representative"])
  ) {
    return forbidden("Insufficient permissions to view assignment history");
  }

  const searchParams = request.nextUrl.searchParams;
  const companyId = searchParams.get("companyId");

  try {
    let cycleIds: string[] | undefined;

    if (companyId) {
      const companyCycles = await db.companySeasonCycle.findMany({
        where: {
          companyId,
        },
        select: { id: true },
      });

      cycleIds = companyCycles.map((cycle) => cycle.id);
    }

    const history = await db.auditLog.findMany({
      where:
        cycleIds !== undefined
          ? {
              targetType: "company_season_cycle",
              targetId: { in: cycleIds },
              action: {
                in: [
                  "assign_company_season_cycle",
                  "bulk_assign_company_season_cycles",
                  "reassign_company_season_cycle",
                ],
              },
            }
          : {
              targetType: "company_season_cycle",
              action: {
                in: [
                  "assign_company_season_cycle",
                  "bulk_assign_company_season_cycles",
                  "reassign_company_season_cycle",
                ],
              },
            },
      include: {
        actor: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: companyId ? undefined : 100,
    });

    return success(
      history.map((entry) => ({
        id: entry.id,
        targetId: entry.targetId,
        action: entry.action,
        changedBy: entry.actor?.name ?? "System",
        meta: entry.meta,
        changedAt: entry.createdAt,
      })),
    );
  } catch (error) {
    console.error("Error fetching assignment history:", error);
    return serverError();
  }
}
