import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { success, unauthorized, serverError } from "@/lib/api/response";
import { db } from "@/lib/db";

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
    const history = await db.companySeasonStatusHistory.findMany({
      where: { companySeasonCycleId: cycleId },
      orderBy: { changedAt: "desc" },
    });

    return success(history);
  } catch (error) {
    console.error("Error fetching status history:", error);
    return serverError();
  }
}
