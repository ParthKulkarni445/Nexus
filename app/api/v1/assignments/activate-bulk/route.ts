import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasRoleOrCoordinatorType } from "@/lib/api/auth";
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

const bulkActivateSchema = z.object({
  seasonId: z.string().uuid(),
  companyIds: z.array(z.string().uuid()).min(1).max(500),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (
    !hasRoleOrCoordinatorType(user, ["tpo_admin"], ["student_representative"])
  ) {
    return forbidden("Insufficient permissions to activate companies");
  }

  const validation = await validateBody(request, bulkActivateSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const uniqueCompanyIds = Array.from(new Set(validation.companyIds));

    const existingCycles = await db.companySeasonCycle.findMany({
      where: {
        seasonId: validation.seasonId,
        companyId: {
          in: uniqueCompanyIds,
        },
      },
      select: {
        companyId: true,
      },
    });

    const existingCompanyIds = new Set(
      existingCycles.map((cycle) => cycle.companyId),
    );

    const companyIdsToCreate = uniqueCompanyIds.filter(
      (companyId) => !existingCompanyIds.has(companyId),
    );

    if (companyIdsToCreate.length > 0) {
      await db.companySeasonCycle.createMany({
        data: companyIdsToCreate.map((companyId) => ({
          companyId,
          seasonId: validation.seasonId,
          status: "not_contacted",
          ownerUserId: null,
          updatedBy: user.id,
          updatedField: "status",
        })),
        skipDuplicates: true,
      });
    }

    await createAuditLog({
      actorId: user.id,
      action: "bulk_activate_company_season_cycles",
      targetType: "season",
      targetId: validation.seasonId,
      meta: {
        requestedCount: uniqueCompanyIds.length,
        createdCount: companyIdsToCreate.length,
      },
      ...clientInfo,
    });

    return success({
      message: `${companyIdsToCreate.length} companies activated for the season`,
      createdCount: companyIdsToCreate.length,
      skippedCount: uniqueCompanyIds.length - companyIdsToCreate.length,
    });
  } catch (error) {
    console.error("Error activating season cycles:", error);
    return serverError();
  }
}
