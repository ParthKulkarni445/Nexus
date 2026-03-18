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
    const seasons = await db.recruitmentSeason.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        companyCycles: {
          include: {
            drives: true,
          },
        },
      },
    });

    const data = seasons.map((season) => {
      const cycles = season.companyCycles;

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
