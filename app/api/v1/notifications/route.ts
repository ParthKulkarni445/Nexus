import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/api/auth";
import { success, unauthorized, serverError } from "@/lib/api/response";
import { validateBody } from "@/lib/api/validation";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

const markReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()),
});

/**
 * GET /api/v1/notifications
 * User notification feed
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const searchParams = request.nextUrl.searchParams;
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  try {
    let query = db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    if (unreadOnly) {
      query = db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(50);
    }

    const notificationsList = await query;

    return success(notificationsList);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return serverError();
  }
}
