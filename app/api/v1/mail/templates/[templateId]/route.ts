import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser, hasRoleOrCoordinatorType } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api/response";
import { validateBody } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { headers } from "next/headers";

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  subject: z.string().min(1).max(500).optional(),
  bodyHtml: z.string().min(1).optional(),
  bodyText: z.string().optional(),
  variables: z.array(z.string()).optional(),
  sendPolicy: z.record(z.string(), z.any()).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (
    !hasRoleOrCoordinatorType(user, ["tpo_admin"], [
      "mailing_team",
      "student_representative",
    ])
  ) {
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
    const currentTemplate = await db.emailTemplate.findUnique({
      where: { id: templateId },
    });

    if (!currentTemplate) {
      return notFound("Template not found");
    }

    if (currentTemplate.status === "approved") {
      const latestVersion = await db.emailTemplateVersion.findFirst({
        where: { templateId },
        orderBy: { version: "desc" },
      });

      await db.emailTemplateVersion.create({
        data: {
          templateId,
          version: latestVersion ? latestVersion.version + 1 : 1,
          subject: currentTemplate.subject,
          bodyHtml: currentTemplate.bodyHtml,
          bodyText: currentTemplate.bodyText,
          variables: currentTemplate.variables,
          createdBy: user.id,
        },
      });
    }

    const updatedTemplate = await db.emailTemplate.update({
      where: { id: templateId },
      data: {
        ...validation,
        status: "approved",
        approvedBy: currentTemplate.approvedBy ?? user.id,
        updatedAt: new Date(),
      },
    });

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (
    !hasRoleOrCoordinatorType(user, ["tpo_admin"], [
      "mailing_team",
      "student_representative",
    ])
  ) {
    return forbidden("Insufficient permissions");
  }

  const { templateId } = await params;
  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const currentTemplate = await db.emailTemplate.findUnique({
      where: { id: templateId },
      include: {
        _count: {
          select: {
            mailRequests: true,
            emails: true,
          },
        },
      },
    });

    if (!currentTemplate) {
      return notFound("Template not found");
    }

    if (currentTemplate._count.mailRequests > 0 || currentTemplate._count.emails > 0) {
      return badRequest(
        "Template cannot be deleted after it has been used in requests or emails"
      );
    }

    await db.emailTemplate.delete({
      where: { id: templateId },
    });

    await createAuditLog({
      actorId: user.id,
      action: "delete_email_template",
      targetType: "email_template",
      targetId: templateId,
      meta: { name: currentTemplate.name },
      ...clientInfo,
    });

    return success({ id: templateId });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return notFound("Template not found");
    }

    console.error("Error deleting template:", error);
    return serverError();
  }
}
