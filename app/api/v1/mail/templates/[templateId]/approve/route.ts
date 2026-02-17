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
import { emailTemplates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

/**
 * POST /api/v1/mail/templates/:templateId/approve
 * Approve draft template
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin"])) {
    return forbidden("Only administrators can approve templates");
  }

  const { templateId } = await params;
  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const [approvedTemplate] = await db
      .update(emailTemplates)
      .set({
        status: "approved",
        approvedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.id, templateId))
      .returning();

    if (!approvedTemplate) {
      return notFound("Template not found");
    }

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: "approve_email_template",
      targetType: "email_template",
      targetId: templateId,
      ...clientInfo,
    });

    return success(approvedTemplate);
  } catch (error) {
    console.error("Error approving template:", error);
    return serverError();
  }
}
