import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/api/auth";
import { success, unauthorized, serverError } from "@/lib/api/response";
import { validateBody } from "@/lib/api/validation";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, inArray, and } from "drizzle-orm";

const markReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()),
});

/**
 * POST /api/v1/notifications/mark-read
 * Mark notifications as read
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const validation = await validateBody(request, markReadSchema);

  if (validation instanceof Response) {
    return validation;
  }

  try {
    await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(notifications.userId, user.id),
          inArray(notifications.id, validation.notificationIds)
        )
      );

    return success({ message: "Notifications marked as read" });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return serverError();
  }
}
