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

const updateDriveSchema = z.object({
  title: z.string().min(1).max(255).optional(),
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ driveId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions");
  }

  const { driveId } = await params;
  const validation = await validateBody(request, updateDriveSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const updatedDrive = await db.drive.update({
      where: { id: driveId },
      data: {
        title: validation.title,
        compensationAmount: validation.compensationAmount,
        jobDescriptionText: validation.jobDescriptionText,
        jobDescriptionDocUrl: validation.jobDescriptionDocUrl,
        notificationFormUrl: validation.notificationFormUrl,
        notes: validation.notes,
        eligibilityRules:
          validation.eligibilityRules !== undefined
            ? {
                deleteMany: {},
                create: validation.eligibilityRules.map((rule) => ({
                  branches: rule.branches ?? [],
                  includeMinorBranches: rule.includeMinorBranches ?? false,
                  minCgpa: rule.minCgpa,
                  allowsBacklogs: rule.allowsBacklogs ?? false,
                  notes: rule.notes,
                })),
              }
            : undefined,
        updatedAt: new Date(),
      },
      include: {
        eligibilityRules: true,
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "update_drive",
      targetType: "drive",
      targetId: driveId,
      meta: validation,
      ...clientInfo,
    });

    return success(updatedDrive);
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return notFound("Drive not found");
    }

    console.error("Error updating drive:", error);
    return serverError();
  }
}
