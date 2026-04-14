import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { error, success } from "@/lib/api/response";
import { getSessionUserClaims } from "@/lib/api/session";
import { verifyPassword, hashPassword } from "@/lib/api/session";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

/**
 * POST /api/v1/auth/change-password
 * Allows authenticated users to change their password
 * Requires verification of current password
 */
export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUserClaims();
  if (!sessionUser?.userId) {
    return error("Unauthorized", "UNAUTHORIZED", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", "BAD_REQUEST", 400);
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return error(
      parsed.error.issues[0]?.message ?? "Validation failed",
      "VALIDATION_ERROR",
      400
    );
  }

  const { currentPassword, newPassword } = parsed.data;

  try {
    const user = await db.user.findUnique({
      where: { id: sessionUser.userId },
    });

    if (!user || !user.isActive) {
      return error("User not found", "NOT_FOUND", 404);
    }

    // Verify current password
    const meta = ((user.profileMeta ?? {}) as Record<string, string>) ?? {};
    const storedPasswordHash = meta.passwordHash;

    if (!storedPasswordHash || !verifyPassword(currentPassword, storedPasswordHash)) {
      return error("Current password is incorrect", "INVALID_PASSWORD", 401);
    }

    // Hash new password
    const newPasswordHash = hashPassword(newPassword);

    // Update password
    await db.user.update({
      where: { id: user.id },
      data: {
        profileMeta: {
          ...meta,
          passwordHash: newPasswordHash,
        } as Prisma.JsonObject,
      },
    });

    return success({
      message: "Password changed successfully",
    });
  } catch (err) {
    console.error("Password change error:", err);
    return error("Failed to change password", "DATABASE_ERROR", 500);
  }
}
