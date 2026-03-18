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
  driveStatusCounts: Record<string, number>;
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

  const driveStatusCounts: Record<string, number> = {};

  const companies = new Set<string>();

  cycles.forEach((cycle) => {
    companies.add(cycle.companyId);

    cycle.drives.forEach((drive) => {
      driveStatusCounts[drive.status] =
        (driveStatusCounts[drive.status] || 0) + 1;
    });
  });

  return {
    seasonId,
    companiesInSeason: companies.size,
    driveStatusCounts,
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

    const deltaDriveStatus: Record<string, number> = {};

    const allStatuses = new Set([
      ...Object.keys(statsA.driveStatusCounts),
      ...Object.keys(statsB.driveStatusCounts),
    ]);

    allStatuses.forEach((status) => {
      const a = statsA.driveStatusCounts[status] || 0;
      const b = statsB.driveStatusCounts[status] || 0;
      deltaDriveStatus[status] = b - a;
    });

    const deltaCompanies =
      (statsB.companiesInSeason || 0) - (statsA.companiesInSeason || 0);

    return success({
      seasonA: statsA,
      seasonB: statsB,
      delta: {
        companiesInSeason: deltaCompanies,
        driveStatusCounts: deltaDriveStatus,
      },
    });
  } catch (error) {
    console.error("Error comparing season stats:", error);
    return serverError();
  }
}
