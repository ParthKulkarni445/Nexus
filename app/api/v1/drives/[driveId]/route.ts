import { NextRequest } from "next/server";
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
import { drives } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

/**
 * PUT /api/v1/drives/:driveId
 * Update drive details/status
 */
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
    const updateData: any = {
      ...validation,
      updatedAt: new Date(),
    };

    if (validation.startAt) {
      updateData.startAt = new Date(validation.startAt);
    }
    if (validation.endAt) {
      updateData.endAt = new Date(validation.endAt);
    }

    const [updatedDrive] = await db
      .update(drives)
      .set(updateData)
      .where(eq(drives.id, driveId))
      .returning();

    if (!updatedDrive) {
      return notFound("Drive not found");
    }

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: "update_drive",
      targetType: "drive",
      targetId: driveId,
      meta: validation,
      ...clientInfo,
    });

    return success(updatedDrive);
  } catch (error) {
    console.error("Error updating drive:", error);
    return serverError();
  }
}
