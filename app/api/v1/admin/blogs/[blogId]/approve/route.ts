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
import { blogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

/**
 * POST /api/v1/admin/blogs/:blogId/approve
 * Approve blog
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ blogId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions");
  }

  const { blogId } = await params;
  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const [approvedBlog] = await db
      .update(blogs)
      .set({
        moderationStatus: "approved",
        approvedBy: user.id,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(blogs.id, blogId))
      .returning();

    if (!approvedBlog) {
      return notFound("Blog not found");
    }

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: "approve_blog",
      targetType: "blog",
      targetId: blogId,
      ...clientInfo,
    });

    return success(approvedBlog);
  } catch (error) {
    console.error("Error approving blog:", error);
    return serverError();
  }
}
