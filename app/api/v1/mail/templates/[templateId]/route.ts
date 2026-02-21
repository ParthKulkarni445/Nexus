import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasRoleOrCoordinatorType } from "@/lib/api/auth";
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
import { emailTemplates, emailTemplateVersions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { headers } from "next/headers";

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  subject: z.string().min(1).max(500).optional(),
  bodyHtml: z.string().min(1).optional(),
  bodyText: z.string().optional(),
  variables: z.array(z.string()).optional(),
  sendPolicy: z.record(z.string(), z.any()).optional(),
});

/**
 * PUT /api/v1/mail/templates/:templateId
 * Edit template (approved template edit creates new draft version)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRoleOrCoordinatorType(user, ["tpo_admin"], ["mailing_team"])) {
    return forbidden("Insufficient permissions");
  }

  const { templateId } = await params;
  const validation = await validateBody(request, updateTemplateSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const currentTemplate = await db.query.emailTemplates.findFirst({
      where: eq(emailTemplates.id, templateId),
    });

    if (!currentTemplate) {
      return notFound("Template not found");
    }

    // If template is approved, create new version and set to draft
    if (currentTemplate.status === "approved") {
      // Get the latest version number
      const versions = await db.query.emailTemplateVersions.findMany({
        where: eq(emailTemplateVersions.templateId, templateId),
        orderBy: [desc(emailTemplateVersions.version)],
        limit: 1,
      });

      const nextVersion = versions.length > 0 ? versions[0].version + 1 : 1;

      // Create new version
      await db.insert(emailTemplateVersions).values({
        templateId,
        version: nextVersion,
        subject: currentTemplate.subject,
        bodyHtml: currentTemplate.bodyHtml,
        bodyText: currentTemplate.bodyText,
        variables: currentTemplate.variables,
        createdBy: user.id,
      });
    }

    // Update template
    const [updatedTemplate] = await db
      .update(emailTemplates)
      .set({
        ...validation,
        status: currentTemplate.status === "approved" ? "draft" : currentTemplate.status,
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.id, templateId))
      .returning();

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: "update_email_template",
      targetType: "email_template",
      targetId: templateId,
      meta: validation,
      ...clientInfo,
    });

    return success(updatedTemplate);
  } catch (error) {
    console.error("Error updating template:", error);
    return serverError();
  }
}
