import { NextRequest } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from "@/lib/api/response";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { drives } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

/**
 * POST /api/v1/drives/:driveId/confirm
 * Confirm schedule and trigger student notifications
 */
export async function POST(
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
  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const [confirmedDrive] = await db
      .update(drives)
      .set({
        status: "confirmed",
        updatedAt: new Date(),
      })
      .where(eq(drives.id, driveId))
      .returning();

    if (!confirmedDrive) {
      return notFound("Drive not found");
    }

    // TODO: Trigger notifications to students
    // This would involve creating notification records for relevant students

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: "confirm_drive",
      targetType: "drive",
      targetId: driveId,
      ...clientInfo,
    });

    return success({
      message: "Drive confirmed successfully",
      drive: confirmedDrive,
    });
  } catch (error) {
    console.error("Error confirming drive:", error);
    return serverError();
  }
}
