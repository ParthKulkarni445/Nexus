import { NextRequest } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  serverError,
} from "@/lib/api/response";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions to access moderation queue");
  }

  const searchParams = request.nextUrl.searchParams;
  const status = (searchParams.get("status") || "pending") as
    | "pending"
    | "approved"
    | "rejected";

  try {
    const blogsList = await db.blog.findMany({
      where: { moderationStatus: status },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return success(blogsList);
  } catch (error) {
    console.error("Error fetching moderation queue:", error);
    return serverError();
  }
}
