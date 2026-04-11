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
import { headers } from "next/headers";

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
    const drive = await db.drive.findUnique({
      where: { id: driveId },
    });

    if (!drive) {
      return notFound("Drive not found");
    }

    await createAuditLog({
      actorId: user.id,
      action: "confirm_drive_deprecated",
      targetType: "drive",
      targetId: driveId,
      ...clientInfo,
    });

    return success({
      message: "Drive roles no longer use confirmation state.",
      drive,
    });
  } catch (error: unknown) {
    console.error("Error confirming drive:", error);
    return serverError();
  }
}
