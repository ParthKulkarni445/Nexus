import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/api/auth";
import { success, unauthorized, notFound, serverError } from "@/lib/api/response";

function branchFromEntryNumber(entryNumber: string | null | undefined) {
  const normalized = (entryNumber ?? "").trim().toUpperCase();
  if (normalized.length < 6) {
    return null;
  }

  const branchCode = normalized.slice(4, 6);

  switch (branchCode) {
    case "CS":
      return "Computer Science and Engineering";
    case "MC":
      return "Mathematics and Computing";
    case "CE":
      return "Civil Engineering";
    case "CH":
      return "Chemical Engineering";
    case "AI":
      return "Artificial Intelligence";
    case "MM":
      return "Metallurgy and Materials";
    case "ME":
      return "Mechanical Engineering";
    case "EE":
      return "Electrical Engineering";
    case "EP":
      return "Engineering Physics";
    default:
      return null;
  }
}

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
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        drives: true,
        interactions: true,
      },
    });

    const placements = await db.placement.findMany({
      where: { seasonId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        student: {
          select: {
            profileMeta: true,
          },
        },
      },
    });

    const cycleStatusDistribution: Record<string, number> = {};
    let rolesCount = 0;
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
        rolesCount += 1;
        const key = drive.createdAt.toISOString().slice(0, 10);
        const existing = activityByDate.get(key) ?? {
          drives: 0,
          interactions: 0,
        };
        existing.drives += 1;
        activityByDate.set(key, existing);
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

    const packageValues = placements
      .map((placement) => Number(placement.packageAmount))
      .filter((value) => !Number.isNaN(value))
      .sort((left, right) => left - right);

    const offers = packageValues.length;
    const totalPackage = packageValues.reduce((sum, value) => sum + value, 0);
    const avgPackage = offers > 0 ? totalPackage / offers : 0;
    const minPackage = offers > 0 ? packageValues[0] : 0;
    const maxPackage = offers > 0 ? packageValues[offers - 1] : 0;
    const medianPackage =
      offers === 0
        ? 0
        : offers % 2 === 1
          ? packageValues[(offers - 1) / 2]
          : (packageValues[offers / 2 - 1] + packageValues[offers / 2]) / 2;

    const branchMap = new Map<
      string,
      { offers: number; totalPackage: number; highestPackage: number }
    >();
    const companyHiringMap = new Map<string, { name: string; offers: number }>();
    const packageBands = [
      { label: "< 5", min: 0, max: 5, count: 0 },
      { label: "5 - 10", min: 5, max: 10, count: 0 },
      { label: "10 - 20", min: 10, max: 20, count: 0 },
      { label: "20+", min: 20, max: Number.POSITIVE_INFINITY, count: 0 },
    ];

    placements.forEach((placement) => {
      const packageAmount = Number(placement.packageAmount);
      const profileMeta =
        placement.student?.profileMeta &&
        typeof placement.student.profileMeta === "object" &&
        !Array.isArray(placement.student.profileMeta)
          ? (placement.student.profileMeta as Record<string, unknown>)
          : null;
      const branch =
        branchFromEntryNumber(placement.studentEntryNumber) ??
        (typeof profileMeta?.branch === "string"
          ? profileMeta.branch.trim()
          : typeof profileMeta?.department === "string"
            ? profileMeta.department.trim()
            : typeof profileMeta?.program === "string"
              ? profileMeta.program.trim()
              : "Unknown");

      const branchEntry = branchMap.get(branch) ?? {
        offers: 0,
        totalPackage: 0,
        highestPackage: 0,
      };
      branchEntry.offers += 1;
      branchEntry.totalPackage += packageAmount;
      branchEntry.highestPackage = Math.max(branchEntry.highestPackage, packageAmount);
      branchMap.set(branch, branchEntry);

      const companyEntry = companyHiringMap.get(placement.companyId) ?? {
        name: placement.company.name,
        offers: 0,
      };
      companyEntry.offers += 1;
      companyHiringMap.set(placement.companyId, companyEntry);

      const packageBand = packageBands.find(
        (band) => packageAmount >= band.min && packageAmount < band.max,
      );
      if (packageBand) {
        packageBand.count += 1;
      }
    });

    const branchStats = Array.from(branchMap.entries())
      .map(([branch, value]) => ({
        branch,
        offers: value.offers,
        averagePackage: value.offers > 0 ? value.totalPackage / value.offers : 0,
        highestPackage: value.highestPackage,
      }))
      .sort((left, right) => right.offers - left.offers);

    const topHiringCompanies = Array.from(companyHiringMap.entries())
      .map(([companyId, value]) => ({
        companyId,
        companyName: value.name,
        offers: value.offers,
      }))
      .sort((left, right) => right.offers - left.offers)
      .slice(0, 5);

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
      rolesCount,
      recentActivityTrend,
      lastUpdatedAt,
      placementSummary: {
        offers,
        studentsPlaced: offers,
        avgPackage,
        medianPackage,
        minPackage,
        maxPackage,
      },
      branchStats,
      packageBands: packageBands.map(({ label, count }) => ({ label, count })),
      topHiringCompanies,
    });
  } catch (error) {
    console.error("Error fetching season summary stats:", error);
    return serverError();
  }
}
