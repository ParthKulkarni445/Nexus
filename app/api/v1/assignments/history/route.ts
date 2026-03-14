import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { success, unauthorized, serverError } from "@/lib/api/response";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const searchParams = request.nextUrl.searchParams;
  const companyId = searchParams.get("companyId");

  try {
    const history = await db.companyAssignmentHistory.findMany({
      where: companyId ? { assignmentId: companyId } : undefined,
      orderBy: { changedAt: "desc" },
      take: companyId ? undefined : 100,
    });

    return success(history);
  } catch (error) {
    console.error("Error fetching assignment history:", error);
    return serverError();
  }
}
