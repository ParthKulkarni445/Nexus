import { NextRequest } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import { success, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { db } from "@/lib/db";
import { blogs } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/v1/admin/blogs/moderation
 * Moderation queue (status filter)
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions to access moderation queue");
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status") || "pending";

  try {
    const blogsList = await db
      .select()
      .from(blogs)
      .where(eq(blogs.moderationStatus, status as any))
      .orderBy(desc(blogs.createdAt))
      .limit(100);

    return success(blogsList);
  } catch (error) {
    console.error("Error fetching moderation queue:", error);
    return serverError();
  }
}
