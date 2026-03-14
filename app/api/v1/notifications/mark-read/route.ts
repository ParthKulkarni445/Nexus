import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/api/auth";
import { success, unauthorized, serverError } from "@/lib/api/response";
import { validateBody } from "@/lib/api/validation";
import { db } from "@/lib/db";

const markReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()),
});

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
    await db.notification.updateMany({
      where: {
        userId: user.id,
        id: { in: validation.notificationIds },
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return success({ message: "Notifications marked as read" });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return serverError();
  }
}
