import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from "@/lib/api/response";
import { validateBody } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { mailRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

const rejectSchema = z.object({
  reviewNote: z.string().min(1),
});

/**
 * POST /api/v1/mail/requests/:requestId/reject
 * Reject request with feedback
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "mailing_team"])) {
    return forbidden("Only mailing team can reject requests");
  }

  const { requestId } = await params;
  const validation = await validateBody(request, rejectSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const [rejectedRequest] = await db
      .update(mailRequests)
      .set({
        status: "rejected",
        reviewedBy: user.id,
        reviewNote: validation.reviewNote,
        updatedAt: new Date(),
      })
      .where(eq(mailRequests.id, requestId))
      .returning();

    if (!rejectedRequest) {
      return notFound("Mail request not found");
    }

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: "reject_mail_request",
      targetType: "mail_request",
      targetId: requestId,
      meta: { reviewNote: validation.reviewNote },
      ...clientInfo,
    });

    return success(rejectedRequest);
  } catch (error) {
    console.error("Error rejecting mail request:", error);
    return serverError();
  }
}
