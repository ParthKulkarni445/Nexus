import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/api/auth";
import { success, unauthorized, serverError } from "@/lib/api/response";

export async function GET(_request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  try {
    const [seasons, placements] = await Promise.all([
      db.recruitmentSeason.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          companyCycles: {
            include: {
              drives: true,
            },
          },
        },
      }),
      db.placement.findMany({
        select: {
          seasonId: true,
          packageAmount: true,
        },
      }),
    ]);

    const placementStats = new Map<
      string,
      { studentsPlaced: number; totalCompensation: number }
    >();

    placements.forEach((placement) => {
      const current = placementStats.get(placement.seasonId) ?? {
        studentsPlaced: 0,
        totalCompensation: 0,
      };
      const packageAmount = Number(placement.packageAmount);

      placementStats.set(placement.seasonId, {
        studentsPlaced: current.studentsPlaced + 1,
        totalCompensation:
          current.totalCompensation +
          (Number.isFinite(packageAmount) ? packageAmount : 0),
      });
    });

    const data = seasons.map((season) => {
      const cycles = season.companyCycles;
      const placementSummary = placementStats.get(season.id) ?? {
        studentsPlaced: 0,
        totalCompensation: 0,
      };

      let totalDrives = 0;
      let confirmedDrives = 0;
      let completedDrives = 0;
      let conflictFlaggedDrives = 0;

      cycles.forEach((cycle) => {
        cycle.drives.forEach((drive) => {
          totalDrives += 1;
          if (drive.status === "confirmed") confirmedDrives += 1;
          if (drive.status === "completed") completedDrives += 1;
          if (drive.isConflictFlagged) conflictFlaggedDrives += 1;
        });
      });

      return {
        id: season.id,
        name: season.name,
        seasonType: season.seasonType,
        academicYear: season.academicYear,
        companiesInSeason: cycles.length,
        studentsPlaced: placementSummary.studentsPlaced,
        avgCompensation:
          placementSummary.studentsPlaced > 0
            ? placementSummary.totalCompensation / placementSummary.studentsPlaced
            : 0,
        totalDrives,
        confirmedDrives,
        completedDrives,
        conflictFlaggedDrives,
      };
    });

    return success(data);
  } catch (error) {
    console.error("Error fetching drives season stats:", error);
    return serverError();
  }
}
