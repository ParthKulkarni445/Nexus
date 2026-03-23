import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasRoleOrCoordinatorType } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from "@/lib/api/response";
import { uuidLikeSchema, validateBody } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { headers } from "next/headers";

const createAssignmentSchema = z.object({
  companySeasonCycleId: uuidLikeSchema,
  assigneeUserId: uuidLikeSchema,
  notes: z.string().optional(),
});

type AssignmentListItem = {
  companySeasonCycleId: string;
  companyId: string;
  companyName: string;
  industry: string | null;
  status: string;
  coordinatorId: string;
  coordinatorName: string;
  seasonId: string;
  season: string;
  assignedAt: string;
};

type UnassignedCycleItem = {
  companySeasonCycleId: string;
  companyId: string;
  companyName: string;
  industry: string | null;
  status: string;
  seasonId: string;
  season: string;
  updatedAt: string;
};

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (
    !hasRoleOrCoordinatorType(user, ["tpo_admin"], ["student_representative"])
  ) {
    return forbidden("Insufficient permissions to view assignments");
  }

  try {
    const [coordinatorRows, cycleRows] = await Promise.all([
      db.user.findMany({
        where: {
          role: "coordinator",
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          coordinatorType: true,
        },
        orderBy: { name: "asc" },
      }),
      db.companySeasonCycle.findMany({
        include: {
          company: {
            select: {
              id: true,
              name: true,
              industry: true,
            },
          },
          season: {
            select: {
              id: true,
              name: true,
            },
          },
          owner: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          { updatedAt: "desc" },
          { createdAt: "desc" },
        ],
      }),
    ]);

    const assignments: AssignmentListItem[] = cycleRows.flatMap((cycle) => {
      if (!cycle.owner) {
        return [];
      }

      return [
        {
          companySeasonCycleId: cycle.id,
          companyId: cycle.company.id,
          companyName: cycle.company.name,
          industry: cycle.company.industry,
          status: cycle.status,
          coordinatorId: cycle.owner.id,
          coordinatorName: cycle.owner.name,
          seasonId: cycle.season.id,
          season: cycle.season.name,
          assignedAt: cycle.updatedAt.toISOString(),
        },
      ];
    });

    const unassignedCycles: UnassignedCycleItem[] = cycleRows
      .filter((cycle) => !cycle.ownerUserId)
      .map((cycle) => ({
        companySeasonCycleId: cycle.id,
        companyId: cycle.company.id,
        companyName: cycle.company.name,
        industry: cycle.company.industry,
        status: cycle.status,
        seasonId: cycle.season.id,
        season: cycle.season.name,
        updatedAt: cycle.updatedAt.toISOString(),
      }));

    return success({
      coordinators: coordinatorRows,
      assignments,
      unassignedCycles,
    });
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (
    !hasRoleOrCoordinatorType(user, ["tpo_admin"], ["student_representative"])
  ) {
    return forbidden("Insufficient permissions to create assignments");
  }

  const validation = await validateBody(request, createAssignmentSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const existingCycle = await db.companySeasonCycle.findUnique({
      where: { id: validation.companySeasonCycleId },
      select: {
        id: true,
        ownerUserId: true,
      },
    });

    if (!existingCycle) {
      return notFound("Company season cycle not found");
    }

    const updatedCycle = await db.companySeasonCycle.update({
      where: { id: validation.companySeasonCycleId },
      data: {
        ownerUserId: validation.assigneeUserId,
        updatedBy: user.id,
        updatedField: "owner_user_id",
        updatedAt: new Date(),
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "assign_company_season_cycle",
      targetType: "company_season_cycle",
      targetId: validation.companySeasonCycleId,
      meta: {
        from: existingCycle.ownerUserId,
        to: validation.assigneeUserId,
        note: validation.notes,
      },
      ...clientInfo,
    });

    return success(updatedCycle);
  } catch (error) {
    console.error("Error creating assignment:", error);
    return serverError();
  }
}
