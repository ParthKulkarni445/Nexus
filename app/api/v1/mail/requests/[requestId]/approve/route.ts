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

const approveSchema = z.object({
  sendAt: z.string().datetime().optional(),
});

const rejectSchema = z.object({
  reviewNote: z.string().min(1),
});

/**
 * POST /api/v1/mail/requests/:requestId/approve
 * Approve request for immediate/scheduled send
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
    return forbidden("Only mailing team can approve requests");
  }

  const { requestId } = await params;
  const validation = await validateBody(request, approveSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const [approvedRequest] = await db
      .update(mailRequests)
      .set({
        status: validation.sendAt ? "scheduled" : "approved",
        reviewedBy: user.id,
        sendAt: validation.sendAt ? new Date(validation.sendAt) : null,
        updatedAt: new Date(),
      })
      .where(eq(mailRequests.id, requestId))
      .returning();

    if (!approvedRequest) {
      return notFound("Mail request not found");
    }

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: "approve_mail_request",
      targetType: "mail_request",
      targetId: requestId,
      meta: { sendAt: validation.sendAt },
      ...clientInfo,
    });

    return success(approvedRequest);
  } catch (error) {
    console.error("Error approving mail request:", error);
    return serverError();
  }
}
