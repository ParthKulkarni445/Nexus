import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from "@/lib/api/response";
import { validateBody } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { headers } from "next/headers";

const updateCompanySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).optional(),
  domain: z.string().max(255).optional(),
  industry: z.string().max(100).optional(),
  website: z.string().url().max(500).optional(),
  priority: z.number().int().optional(),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const { companyId } = await params;

  try {
    const company = await db.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return notFound("Company not found");
    }

    const [contacts, seasonAssignments, interactions, recentDrives, latestCycle] =
      await Promise.all([
        db.companyContact.findMany({
          where: { companyId },
          select: {
            id: true,
            name: true,
            designation: true,
            emails: true,
            phones: true,
            preferredContactMethod: true,
            notes: true,
            lastContactedAt: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        db.companySeasonCycle.findMany({
          where: {
            companyId,
            ownerUserId: {
              not: null,
            },
          },
          select: {
            id: true,
            ownerUserId: true,
            updatedAt: true,
            season: {
              select: {
                id: true,
                name: true,
              },
            },
            owner: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { updatedAt: "desc" },
        }),
        db.contactInteraction.findMany({
          where: { companyId },
          select: {
            id: true,
            summary: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        db.drive.findMany({
          where: { companyId },
          select: {
            id: true,
            title: true,
            status: true,
            stage: true,
            startAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        db.companySeasonCycle.findFirst({
          where: { companyId },
          select: {
            id: true,
            status: true,
            updatedBy: true,
            updatedField: true,
            updatedAt: true,
            statusHistory: {
              select: {
                id: true,
                toStatus: true,
                changeNote: true,
                changedAt: true,
                changer: {
                  select: {
                    name: true,
                  },
                },
              },
              orderBy: { changedAt: "desc" },
            },
          },
          orderBy: { updatedAt: "desc" },
        }),
      ]);

    return success({
      company,
      contacts,
      assignments: seasonAssignments.map((assignment) => ({
        id: assignment.id,
        seasonId: assignment.season.id,
        seasonName: assignment.season.name,
        assigneeUserId: assignment.ownerUserId,
        assigneeName: assignment.owner?.name ?? null,
        assignedAt: assignment.updatedAt,
        notes: null,
      })),
      recentInteractions: interactions,
      recentDrives,
      latestCycle: latestCycle
        ? {
            id: latestCycle.id,
            status: latestCycle.status,
            updatedBy: latestCycle.updatedBy,
            updatedField: latestCycle.updatedField,
            updatedAt: latestCycle.updatedAt,
          }
        : null,
      statusHistory: latestCycle?.statusHistory.map((entry) => ({
        id: entry.id,
        toStatus: entry.toStatus,
        changeNote: entry.changeNote,
        changedBy: entry.changer.name,
        changedAt: entry.changedAt,
      })) ?? [],
    });
  } catch (error) {
    console.error("Error fetching company:", error);
    return serverError();
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions to update companies");
  }

  const { companyId } = await params;
  const validation = await validateBody(request, updateCompanySchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const updatedCompany = await db.company.update({
      where: { id: companyId },
      data: {
        ...validation,
        updatedAt: new Date(),
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "update_company",
      targetType: "company",
      targetId: companyId,
      meta: validation,
      ...clientInfo,
    });

    return success(updatedCompany);
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return notFound("Company not found");
    }

    console.error("Error updating company:", error);
    return serverError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin"])) {
    return forbidden("Only administrators can delete companies");
  }

  const { companyId } = await params;
  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    await db.company.delete({ where: { id: companyId } });

    await createAuditLog({
      actorId: user.id,
      action: "delete_company",
      targetType: "company",
      targetId: companyId,
      ...clientInfo,
    });

    return success({ message: "Company deleted successfully" });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return notFound("Company not found");
    }

    console.error("Error deleting company:", error);
    return serverError();
  }
}
