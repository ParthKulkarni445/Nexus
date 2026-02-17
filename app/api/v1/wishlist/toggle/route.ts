import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  serverError,
} from "@/lib/api/response";
import { validateBody } from "@/lib/api/validation";
import { db } from "@/lib/db";
import { studentCompanyFollows } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const toggleWishlistSchema = z.object({
  companyId: z.string().uuid(),
});

/**
 * POST /api/v1/wishlist/toggle
 * Follow/unfollow company
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["student"])) {
    return forbidden("Only students can follow companies");
  }

  const validation = await validateBody(request, toggleWishlistSchema);

  if (validation instanceof Response) {
    return validation;
  }

  try {
    // Check if already following
    const existing = await db.query.studentCompanyFollows.findFirst({
      where: and(
        eq(studentCompanyFollows.studentId, user.id),
        eq(studentCompanyFollows.companyId, validation.companyId)
      ),
    });

    if (existing) {
      // Unfollow
      await db
        .delete(studentCompanyFollows)
        .where(eq(studentCompanyFollows.id, existing.id));

      return success({ message: "Company unfollowed", following: false });
    } else {
      // Follow
      await db.insert(studentCompanyFollows).values({
        studentId: user.id,
        companyId: validation.companyId,
      });

      return success({ message: "Company followed", following: true });
    }
  } catch (error) {
    console.error("Error toggling wishlist:", error);
    return serverError();
  }
}
