import { NextRequest } from "next/server";
import { getCurrentUser, hasRoleOrCoordinatorType } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  serverError,
} from "@/lib/api/response";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (
    !hasRoleOrCoordinatorType(user, ["tpo_admin"], ["student_representative"])
  ) {
    return forbidden("Insufficient permissions to view assignment history");
  }

  const searchParams = request.nextUrl.searchParams;
  const companyId = searchParams.get("companyId");

  try {
    let assignmentIds: string[] | undefined;

    if (companyId) {
      const companyAssignments = await db.companyAssignment.findMany({
        where: {
          itemType: "company",
          itemId: companyId,
        },
        select: { id: true },
      });

      assignmentIds = companyAssignments.map((assignment) => assignment.id);
    }

    const history = await db.companyAssignmentHistory.findMany({
      where:
        assignmentIds !== undefined
          ? { assignmentId: { in: assignmentIds } }
          : undefined,
      orderBy: { changedAt: "desc" },
      take: companyId ? undefined : 100,
    });

    return success(history);
  } catch (error) {
    console.error("Error fetching assignment history:", error);
    return serverError();
  }
}
