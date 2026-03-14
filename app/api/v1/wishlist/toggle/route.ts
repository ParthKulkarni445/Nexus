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

const toggleWishlistSchema = z.object({
  companyId: z.string().uuid(),
});

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
    const existing = await db.studentCompanyFollow.findUnique({
      where: {
        studentId_companyId: {
          studentId: user.id,
          companyId: validation.companyId,
        },
      },
    });

    if (existing) {
      await db.studentCompanyFollow.delete({ where: { id: existing.id } });
      return success({ message: "Company unfollowed", following: false });
    }

    await db.studentCompanyFollow.create({
      data: {
        studentId: user.id,
        companyId: validation.companyId,
      },
    });

    return success({ message: "Company followed", following: true });
  } catch (error) {
    console.error("Error toggling wishlist:", error);
    return serverError();
  }
}
