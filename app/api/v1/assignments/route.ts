import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasRoleOrCoordinatorType } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  serverError,
} from "@/lib/api/response";
import { validateBody } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { headers } from "next/headers";

const createAssignmentSchema = z.object({
  itemType: z.enum(["company", "contact"]),
  itemId: z.string().trim().min(1),
  assigneeUserId: z.string().trim().min(1),
  notes: z.string().optional(),
});

type AssignmentListItem = {
  assignmentId: string;
  companyId: string;
  companyName: string;
  industry: string | null;
  status: string;
  coordinatorId: string;
  coordinatorName: string;
  season: string;
  assignedAt: string;
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
    const [coordinatorRows, assignmentRows] = await Promise.all([
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
      db.companyAssignment.findMany({
        where: {
          itemType: "company",
          isActive: true,
        },
        select: {
          id: true,
          itemId: true,
          assigneeUserId: true,
          assignedAt: true,
          assigneeUser: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { assignedAt: "desc" },
      }),
    ]);

    const latestAssignmentByCompany = new Map<
      string,
      (typeof assignmentRows)[number]
    >();

    for (const row of assignmentRows) {
      if (!latestAssignmentByCompany.has(row.itemId)) {
        latestAssignmentByCompany.set(row.itemId, row);
      }
    }

    const latestAssignments = Array.from(latestAssignmentByCompany.values());
    const companyIds = latestAssignments.map((item) => item.itemId);

    const [companyRows, cycleRows] = await Promise.all([
      companyIds.length > 0
        ? db.company.findMany({
            where: { id: { in: companyIds } },
            select: {
              id: true,
              name: true,
              industry: true,
            },
          })
        : Promise.resolve([]),
      companyIds.length > 0
        ? db.companySeasonCycle.findMany({
            where: { companyId: { in: companyIds } },
            select: {
              companyId: true,
              status: true,
              updatedAt: true,
              season: {
                select: {
                  name: true,
                },
              },
            },
            orderBy: { updatedAt: "desc" },
          })
        : Promise.resolve([]),
    ]);

    const companyById = new Map(companyRows.map((row) => [row.id, row]));
    const latestCycleByCompany = new Map<string, (typeof cycleRows)[number]>();

    for (const row of cycleRows) {
      if (!latestCycleByCompany.has(row.companyId)) {
        latestCycleByCompany.set(row.companyId, row);
      }
    }

    const assignments: AssignmentListItem[] = latestAssignments
      .map((assignment) => {
        const company = companyById.get(assignment.itemId);
        if (!company) return null;

        const latestCycle = latestCycleByCompany.get(assignment.itemId);

        return {
          assignmentId: assignment.id,
          companyId: company.id,
          companyName: company.name,
          industry: company.industry,
          status: latestCycle?.status ?? "not_contacted",
          coordinatorId: assignment.assigneeUserId,
          coordinatorName: assignment.assigneeUser.name,
          season: latestCycle?.season?.name ?? "No active season",
          assignedAt: assignment.assignedAt.toISOString(),
        };
      })
      .filter((item): item is AssignmentListItem => item !== null);

    const assignedCompanyIds = assignments.map((item) => item.companyId);

    const unassignedCompanyRows = await db.company.findMany({
      where:
        assignedCompanyIds.length > 0
          ? {
              id: {
                notIn: assignedCompanyIds,
              },
            }
          : undefined,
      select: {
        id: true,
        name: true,
        industry: true,
      },
      orderBy: { name: "asc" },
    });

    return success({
      coordinators: coordinatorRows,
      assignments,
      unassignedCompanies: unassignedCompanyRows.map((company) => ({
        companyId: company.id,
        companyName: company.name,
        industry: company.industry,
      })),
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
    const assignment = await db.companyAssignment.create({
      data: {
        ...validation,
        assignedBy: user.id,
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "create_assignment",
      targetType: "assignment",
      targetId: assignment.id,
      meta: validation,
      ...clientInfo,
    });

    return success(assignment);
  } catch (error) {
    console.error("Error creating assignment:", error);
    return serverError();
  }
}
