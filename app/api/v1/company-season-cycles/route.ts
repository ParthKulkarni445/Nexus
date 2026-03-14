import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/api/auth";
import { success, unauthorized, serverError } from "@/lib/api/response";
import { paginationSchema } from "@/lib/api/validation";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const searchParams = request.nextUrl.searchParams;
  const params = {
    ...paginationSchema.parse({
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
    }),
    seasonId: searchParams.get("seasonId") || undefined,
    status: searchParams.get("status") || undefined,
    assigneeId: searchParams.get("assigneeId") || undefined,
    companyId: searchParams.get("companyId") || undefined,
  };

  try {
    const where: Prisma.CompanySeasonCycleWhereInput = {
      ...(params.seasonId ? { seasonId: params.seasonId } : {}),
      ...(params.status ? { status: params.status as never } : {}),
      ...(params.assigneeId ? { ownerUserId: params.assigneeId } : {}),
      ...(params.companyId ? { companyId: params.companyId } : {}),
    };

    const offset = (params.page - 1) * params.limit;
    const [total, cycles] = await Promise.all([
      db.companySeasonCycle.count({ where }),
      db.companySeasonCycle.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: params.limit,
        skip: offset,
        include: {
          updater: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    return success(cycles, {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    });
  } catch (error) {
    console.error("Error listing company season cycles:", error);
    return serverError();
  }
}
