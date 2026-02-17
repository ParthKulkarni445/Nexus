import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/api/auth";
import { success, unauthorized, serverError } from "@/lib/api/response";
import { paginationSchema } from "@/lib/api/validation";
import { db } from "@/lib/db";
import { companySeasonCycles } from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

/**
 * GET /api/v1/company-season-cycles
 * List operational company-season rows for dashboard/Kanban
 * Query params: seasonId, status, assigneeId, companyId, page, limit
 */
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
    // Build query conditions
    const conditions = [];

    if (params.seasonId) {
      conditions.push(eq(companySeasonCycles.seasonId, params.seasonId));
    }

    if (params.status) {
      conditions.push(eq(companySeasonCycles.status, params.status as any));
    }

    if (params.assigneeId) {
      conditions.push(eq(companySeasonCycles.ownerUserId, params.assigneeId));
    }

    if (params.companyId) {
      conditions.push(eq(companySeasonCycles.companyId, params.companyId));
    }

    // Count total
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(companySeasonCycles)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Fetch cycles
    const offset = (params.page - 1) * params.limit;
    const cycles = await db
      .select()
      .from(companySeasonCycles)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(companySeasonCycles.updatedAt))
      .limit(params.limit)
      .offset(offset);

    return success(cycles, {
      page: params.page,
      limit: params.limit,
      total: count,
      totalPages: Math.ceil(count / params.limit),
    });
  } catch (error) {
    console.error("Error listing company season cycles:", error);
    return serverError();
  }
}
