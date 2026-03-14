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
  stage: z.enum(["oa", "interview", "hr", "final", "other"]).optional(),
  status: z.enum(["tentative", "confirmed", "completed", "cancelled"]).optional(),
  venue: z.string().max(255).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
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
        ...validation,
        startAt: validation.startAt ? new Date(validation.startAt) : undefined,
        endAt: validation.endAt ? new Date(validation.endAt) : undefined,
        updatedAt: new Date(),
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
