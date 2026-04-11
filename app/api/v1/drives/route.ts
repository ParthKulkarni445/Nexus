import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
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

const createDriveSchema = z.object({
  companyId: z.string().uuid(),
  companySeasonCycleId: z.string().uuid(),
  title: z.string().min(1).max(255),
  compensationAmount: z.number().min(0).max(9999).optional(),
  jobDescriptionText: z.string().optional(),
  jobDescriptionDocUrl: z.string().url().max(500).optional(),
  notificationFormUrl: z.string().url().max(500).optional(),
  eligibilityRules: z
    .array(
      z.object({
        branches: z.array(z.string().min(1).max(100)).default([]),
        includeMinorBranches: z.boolean().optional(),
        minCgpa: z.number().min(0).max(10).optional(),
        allowsBacklogs: z.boolean().optional(),
        notes: z.string().optional(),
      }),
    )
    .optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search");
  const seasonId = searchParams.get("seasonId");
  const companyId = searchParams.get("companyId");
  const ownerUserId = searchParams.get("ownerUserId");

  try {
    const where: Prisma.DriveWhereInput = {
      ...(companyId ? { companyId } : {}),
      ...((seasonId || ownerUserId)
        ? {
            companySeasonCycle: {
              ...(seasonId ? { seasonId } : {}),
              ...(ownerUserId ? { ownerUserId } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { jobDescriptionText: { contains: search, mode: "insensitive" } },
              {
                company: {
                  name: { contains: search, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    };

    const drivesList = await db.drive.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        company: { select: { id: true, name: true, industry: true } },
        eligibilityRules: true,
        companySeasonCycle: {
          select: {
            season: { select: { name: true, seasonType: true } },
          },
        },
        creator: { select: { id: true, name: true } },
      },
    });

    return success(drivesList);
  } catch (error) {
    console.error("Error fetching drives:", error);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions to create drives");
  }

  const validation = await validateBody(request, createDriveSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const drive = await db.drive.create({
      data: {
        companyId: validation.companyId,
        companySeasonCycleId: validation.companySeasonCycleId,
        title: validation.title,
        compensationAmount: validation.compensationAmount,
        jobDescriptionText: validation.jobDescriptionText,
        jobDescriptionDocUrl: validation.jobDescriptionDocUrl,
        notificationFormUrl: validation.notificationFormUrl,
        notes: validation.notes,
        createdBy: user.id,
        eligibilityRules: validation.eligibilityRules?.length
          ? {
              create: validation.eligibilityRules.map((rule) => ({
                branches: rule.branches ?? [],
                includeMinorBranches: rule.includeMinorBranches ?? false,
                minCgpa: rule.minCgpa,
                allowsBacklogs: rule.allowsBacklogs ?? false,
                notes: rule.notes,
              })),
            }
          : undefined,
      },
      include: {
        eligibilityRules: true,
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "create_drive",
      targetType: "drive",
      targetId: drive.id,
      meta: { title: drive.title, eligibilityRuleCount: drive.eligibilityRules.length },
      ...clientInfo,
    });

    return success(drive);
  } catch (error) {
    console.error("Error creating drive:", error);
    return serverError();
  }
}
