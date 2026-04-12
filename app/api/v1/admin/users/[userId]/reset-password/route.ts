import { NextRequest } from "next/server";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  badRequest,
  serverError,
} from "@/lib/api/response";
import { validateBody } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { hashPassword } from "@/lib/api/session";
import { db } from "@/lib/db";
import { headers } from "next/headers";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8).max(128).optional(),
});

function generateTemporaryPassword(length = 12): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let generated = "";

  for (let idx = 0; idx < length; idx += 1) {
    generated += alphabet[crypto.randomInt(0, alphabet.length)];
  }

  return generated;
}

/**
 * POST /api/v1/admin/users/:userId/reset-password
 * Resets a user password and returns the temporary password.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return unauthorized();
  }

  if (!hasRole(currentUser, ["tpo_admin"])) {
    return forbidden("Only administrators can reset passwords");
  }

  const validation = await validateBody(request, resetPasswordSchema);
  if (validation instanceof Response) {
    return validation;
  }

  const { userId } = await params;

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, authProvider: true, profileMeta: true },
    });

    if (!user) {
      return badRequest("User not found");
    }

    const nextPassword = validation.newPassword ?? generateTemporaryPassword();
    const passwordHash = hashPassword(nextPassword);

    const previousMeta = user.profileMeta ?? null;

    const previousObject =
      previousMeta && typeof previousMeta === "object" && !Array.isArray(previousMeta)
        ? (previousMeta as Record<string, unknown>)
        : {};

    await db.user.update({
      where: { id: userId },
      data: {
        authProvider: user.authProvider ?? "credentials",
        profileMeta: {
          ...(previousObject as Prisma.JsonObject),
          passwordHash,
        } as Prisma.InputJsonValue,
      },
    });

    const headersList = await headers();
    const clientInfo = getClientInfo(headersList);

    await createAuditLog({
      actorId: currentUser.id,
      action: "reset_user_password",
      targetType: "user",
      targetId: userId,
      meta: { email: user.email },
      ...clientInfo,
    });

    return success({
      userId,
      temporaryPassword: nextPassword,
      message: "Password reset successful. Share this password securely.",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return serverError();
  }
}
