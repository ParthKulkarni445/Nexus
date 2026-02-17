import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { success, unauthorized, serverError } from "@/lib/api/response";
import { db } from "@/lib/db";
import { companySeasonStatusHistory } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/v1/company-season-cycles/:cycleId/status-history
 * Auditable status transition timeline
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cycleId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const { cycleId } = await params;

  try {
    const history = await db.query.companySeasonStatusHistory.findMany({
      where: eq(companySeasonStatusHistory.companySeasonCycleId, cycleId),
      orderBy: [desc(companySeasonStatusHistory.changedAt)],
    });

    return success(history);
  } catch (error) {
    console.error("Error fetching status history:", error);
    return serverError();
  }
}
