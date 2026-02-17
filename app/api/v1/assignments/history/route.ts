import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { success, unauthorized, serverError } from "@/lib/api/response";
import { db } from "@/lib/db";
import { companyAssignmentHistory } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/v1/assignments/history?companyId=
 * Fetch assignment change history
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const searchParams = request.nextUrl.searchParams;
  const companyId = searchParams.get("companyId");

  try {
    let history;

    if (companyId) {
      // Get history for specific company
      history = await db.query.companyAssignmentHistory.findMany({
        where: eq(companyAssignmentHistory.assignmentId, companyId),
        orderBy: [desc(companyAssignmentHistory.changedAt)],
      });
    } else {
      // Get all history
      history = await db.query.companyAssignmentHistory.findMany({
        orderBy: [desc(companyAssignmentHistory.changedAt)],
        limit: 100,
      });
    }

    return success(history);
  } catch (error) {
    console.error("Error fetching assignment history:", error);
    return serverError();
  }
}
