import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/api/auth";
import { success, unauthorized, notFound, serverError } from "@/lib/api/response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const { seasonId } = await params;

  try {
    const season = await db.recruitmentSeason.findUnique({
      where: { id: seasonId },
    });

    if (!season) {
      return notFound("Season not found");
    }

    const cycles = await db.companySeasonCycle.findMany({
      where: { seasonId },
      include: {
        drives: true,
        interactions: true,
      },
    });

    const cycleStatusDistribution: Record<string, number> = {};
    const driveStatusCounts: Record<string, number> = {};
    let conflictFlaggedDrives = 0;
    let lastUpdatedAt: Date | null = null;

    const activityByDate = new Map<
      string,
      { drives: number; interactions: number }
    >();

    cycles.forEach((cycle) => {
      cycleStatusDistribution[cycle.status] =
        (cycleStatusDistribution[cycle.status] || 0) + 1;

      if (!lastUpdatedAt || cycle.updatedAt > lastUpdatedAt) {
        lastUpdatedAt = cycle.updatedAt;
      }

      cycle.drives.forEach((drive) => {
        driveStatusCounts[drive.status] =
          (driveStatusCounts[drive.status] || 0) + 1;

        if (drive.isConflictFlagged) {
          conflictFlaggedDrives += 1;
        }

        if (drive.startAt) {
          const key = drive.startAt.toISOString().slice(0, 10);
          const existing = activityByDate.get(key) ?? {
            drives: 0,
            interactions: 0,
          };
          existing.drives += 1;
          activityByDate.set(key, existing);
        }
      });

      cycle.interactions.forEach((interaction) => {
        const key = interaction.createdAt.toISOString().slice(0, 10);
        const existing = activityByDate.get(key) ?? {
          drives: 0,
          interactions: 0,
        };
        existing.interactions += 1;
        activityByDate.set(key, existing);
      });
    });

    const recentActivityTrend = Array.from(activityByDate.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .slice(-30)
      .map(([date, value]) => ({ date, ...value }));

    return success({
      season: {
        id: season.id,
        name: season.name,
        seasonType: season.seasonType,
        academicYear: season.academicYear,
        startDate: season.startDate,
        endDate: season.endDate,
      },
      companiesInSeason: cycles.length,
      cycleStatusDistribution,
      driveStatusCounts,
      conflictFlaggedDrives,
      recentActivityTrend,
      lastUpdatedAt,
    });
  } catch (error) {
    console.error("Error fetching season summary stats:", error);
    return serverError();
  }
}
