import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { success, unauthorized, serverError, forbidden } from "@/lib/api/response";
import { db } from "@/lib/db";

/**
 * Mark current time as last viewed notifications
 * This ensures future summary calls only return items created after this point
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  // Only coordinators and tpo_admin can see notifications
  if (user.role !== "coordinator" && user.role !== "tpo_admin") {
    return forbidden();
  }

  try {
    await db.notification.create({
      data: {
        userId: user.id,
        type: "notification_view_marker",
        title: "Viewed work notifications",
        body: "System marker for unseen work notifications",
        isRead: true,
        readAt: new Date(),
        payload: {
          source: "notification_widget",
        },
      },
    });

    return success({ message: "Notifications marked as viewed" });
  } catch (error) {
    console.error("Error marking notifications as viewed:", error);
    return serverError();
  }
}
