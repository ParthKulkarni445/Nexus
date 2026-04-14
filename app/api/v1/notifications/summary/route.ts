import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { success, unauthorized, serverError, forbidden } from "@/lib/api/response";
import { db } from "@/lib/db";

export type NotificationSummary = {
  pendingMails: number;
  pendingBlogs: number;
  assignedCompanies: number;
};

/**
 * Only returns NEW work items (created after user's last notification view)
 * This ensures users only see items they haven't been notified about before
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  // Only coordinators and tpo_admin can see notifications
  if (user.role !== "coordinator" && user.role !== "tpo_admin") {
    return forbidden();
  }

  try {
    const summary: NotificationSummary = {
      pendingMails: 0,
      pendingBlogs: 0,
      assignedCompanies: 0,
    };

    // Use the latest marker to filter only NEW items.
    const marker = await db.notification.findFirst({
      where: {
        userId: user.id,
        type: "notification_view_marker",
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        createdAt: true,
      },
    });

    const lastViewedAt = marker?.createdAt ?? new Date(0);

    // Count pending mails created AFTER last viewed
    if (
      user.role === "tpo_admin" ||
      user.coordinatorType === "mailing_team" ||
      user.coordinatorType === "student_representative"
    ) {
      const pendingMailsCount = await db.mailRequest.count({
        where: {
          status: "pending",
          createdAt: {
            gt: lastViewedAt,
          },
        },
      });
      summary.pendingMails = pendingMailsCount;
    }

    // Count pending blogs created AFTER last viewed
    if (user.role === "tpo_admin" || user.coordinatorType === "student_representative") {
      const pendingBlogsCount = await db.blog.count({
        where: {
          moderationStatus: "pending",
          createdAt: {
            gt: lastViewedAt,
          },
        },
      });
      summary.pendingBlogs = pendingBlogsCount;
    }

    // Count companies assigned (or re-assigned) to this exact user AFTER last viewed.
    // Assignments are stored via CompanySeasonCycle.ownerUserId with updatedField="owner_user_id".
    const assignedCompaniesCount = await db.companySeasonCycle.count({
      where: {
        ownerUserId: user.id,
        updatedField: "owner_user_id",
        updatedAt: {
          gt: lastViewedAt,
        },
      },
    });
    summary.assignedCompanies = assignedCompaniesCount;

    return success(summary);
  } catch (error) {
    console.error("Error fetching notification summary:", error);
    return serverError();
  }
}

