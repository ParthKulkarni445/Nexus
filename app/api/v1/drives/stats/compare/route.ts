import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/api/auth";
import { success, unauthorized, badRequest, serverError } from "@/lib/api/response";

async function computeSeasonStats(
  seasonId: string,
  companyId?: string
): Promise<{
  seasonId: string;
  companiesInSeason: number;
  rolesCount: number;
}> {
  const where: Prisma.CompanySeasonCycleWhereInput = {
    seasonId,
    ...(companyId ? { companyId } : {}),
  };

  const cycles = await db.companySeasonCycle.findMany({
    where,
    include: {
      drives: true,
    },
  });

  const companies = new Set<string>();
  let rolesCount = 0;

  cycles.forEach((cycle) => {
    companies.add(cycle.companyId);

    cycle.drives.forEach((drive) => {
      rolesCount += 1;
    });
  });

  return {
    seasonId,
    companiesInSeason: companies.size,
    rolesCount,
  };
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const searchParams = request.nextUrl.searchParams;
  const seasonAId = searchParams.get("seasonAId");
  const seasonBId = searchParams.get("seasonBId");
  const companyId = searchParams.get("companyId") || undefined;

  if (!seasonAId || !seasonBId) {
    return badRequest("Both seasonAId and seasonBId are required");
  }

  try {
    const [statsA, statsB] = await Promise.all([
      computeSeasonStats(seasonAId, companyId),
      computeSeasonStats(seasonBId, companyId),
    ]);

    const deltaCompanies =
      (statsB.companiesInSeason || 0) - (statsA.companiesInSeason || 0);
    const deltaRoles = (statsB.rolesCount || 0) - (statsA.rolesCount || 0);

    return success({
      seasonA: statsA,
      seasonB: statsB,
      delta: {
        companiesInSeason: deltaCompanies,
        rolesCount: deltaRoles,
      },
    });
  } catch (error) {
    console.error("Error comparing season stats:", error);
    return serverError();
  }
}
