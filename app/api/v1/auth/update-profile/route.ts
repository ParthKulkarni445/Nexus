import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { error, success } from "@/lib/api/response";
import { getSessionUserClaims } from "@/lib/api/session";

const updateProfileSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(100),
});

/**
 * PUT /api/v1/auth/update-profile
 * Updates the authenticated user's profile (name)
 */
export async function PUT(request: NextRequest) {
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

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return error(
      parsed.error.issues[0]?.message ?? "Validation failed",
      "VALIDATION_ERROR",
      400
    );
  }

  const { name } = parsed.data;

  try {
    const updatedUser = await db.user.update({
      where: { id: sessionUser.userId },
      data: { name },
    });

    return success({
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
      },
    });
  } catch (err) {
    console.error("Profile update error:", err);
    return error("Failed to update profile", "DATABASE_ERROR", 500);
  }
}
