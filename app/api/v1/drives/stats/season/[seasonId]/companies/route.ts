import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/api/auth";
import { success, unauthorized, serverError } from "@/lib/api/response";

export async function GET(
  request: NextRequest,
  { params }: { params: { seasonId: string } }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const { seasonId } = params;
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search");
  const status = searchParams.get("status");
  const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") || "20", 10) || 20, 1),
    100
  );
  const skip = (page - 1) * limit;

  try {
    const where: Prisma.CompanySeasonCycleWhereInput = {
      seasonId,
      ...(status ? { status: status as any } : {}),
      ...(search
        ? {
            company: {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { industry: { contains: search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    };

    const [total, cycles] = await db.$transaction([
      db.companySeasonCycle.count({ where }),
      db.companySeasonCycle.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
        include: {
          company: {
            include: {
              contacts: true,
            },
          },
          drives: {
            orderBy: { startAt: "desc" },
          },
          interactions: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
    ]);

    const rows = cycles.map((cycle) => {
      const { company } = cycle;
      const drives = cycle.drives;

      const totalDrives = drives.length;
      const confirmedDrives = drives.filter((d) => d.status === "confirmed").length;
      const completedDrives = drives.filter((d) => d.status === "completed").length;
      const conflictFlagged = drives.some((d) => d.isConflictFlagged);

      const lastDriveAt = drives[0]?.startAt ?? null;
      const lastInteractionAt = cycle.interactions[0]?.createdAt ?? null;
      const lastActivityAt = [lastDriveAt, lastInteractionAt, cycle.updatedAt]
        .filter(Boolean)
        .reduce<Date | null>((latest, current) => {
          if (!current) return latest;
          if (!latest || current > latest) return current;
          return latest;
        }, null);

      return {
        companyId: company.id,
        companyName: company.name,
        industry: company.industry,
        seasonStatus: cycle.status,
        drives: {
          total: totalDrives,
          confirmed: confirmedDrives,
          completed: completedDrives,
        },
        lastActivityAt: lastActivityAt?.toISOString() ?? null,
        contactsCount: company.contacts.length,
        conflictFlagged,
      };
    });

    return success(rows, { page, limit, total });
  } catch (error) {
    console.error("Error fetching season company stats:", error);
    return serverError();
  }
}
