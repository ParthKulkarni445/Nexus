import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
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
    const confirmedDrive = await db.drive.update({
      where: { id: driveId },
      data: {
        status: "confirmed",
        updatedAt: new Date(),
      },
    });

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
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return notFound("Drive not found");
    }

    console.error("Error confirming drive:", error);
    return serverError();
  }
}
