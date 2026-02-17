import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  serverError,
} from "@/lib/api/response";
import { validateBody } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { emailTemplates } from "@/lib/db/schema";
import { desc, eq, or } from "drizzle-orm";
import { headers } from "next/headers";

const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  subject: z.string().min(1).max(500),
  bodyHtml: z.string().min(1),
  bodyText: z.string().optional(),
  variables: z.array(z.string()).optional(),
  sendPolicy: z.record(z.string(), z.any()).optional(),
});

/**
 * GET /api/v1/mail/templates
 * List templates with status/version filtering
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");

  try {
    let templates;

    if (status) {
      templates = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.status, status as any))
        .orderBy(desc(emailTemplates.createdAt));
    } else {
      templates = await db
        .select()
        .from(emailTemplates)
        .orderBy(desc(emailTemplates.createdAt));
    }

    return success(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return serverError();
  }
}

/**
 * POST /api/v1/mail/templates
 * Create draft template
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "mailing_team"])) {
    return forbidden("Insufficient permissions to create templates");
  }

  const validation = await validateBody(request, createTemplateSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const [template] = await db
      .insert(emailTemplates)
      .values({
        ...validation,
        status: "draft",
        createdBy: user.id,
      })
      .returning();

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: "create_email_template",
      targetType: "email_template",
      targetId: template.id,
      meta: { name: template.name },
      ...clientInfo,
    });

    return success(template);
  } catch (error: any) {
    if (error.code === "23505") {
      return serverError("Template with this slug already exists");
    }
    console.error("Error creating template:", error);
    return serverError();
  }
}
