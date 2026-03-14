import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser, hasRoleOrCoordinatorType } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  serverError,
} from "@/lib/api/response";
import { validateBody } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
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

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");

  try {
    const templates = await db.emailTemplate.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            versions: true,
            mailRequests: true,
            emails: true,
          },
        },
      },
    });

    return success(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
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
    return forbidden("Insufficient permissions to create templates");
  }

  const validation = await validateBody(request, createTemplateSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const template = await db.emailTemplate.create({
      data: {
        ...validation,
        status: "approved",
        createdBy: user.id,
        approvedBy: user.id,
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "create_email_template",
      targetType: "email_template",
      targetId: template.id,
      meta: { name: template.name },
      ...clientInfo,
    });

    return success(template);
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return serverError("Template with this slug already exists");
    }

    console.error("Error creating template:", error);
    return serverError();
  }
}
