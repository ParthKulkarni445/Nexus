import { NextRequest } from "next/server";
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

const createMailRequestSchema = z.object({
  companyId: z.string().uuid().optional(),
  companySeasonCycleId: z.string().uuid().optional(),
  requestType: z.enum(["template", "custom"]),
  templateId: z.string().uuid().optional(),
  templateVersion: z.number().int().optional(),
  customSubject: z.string().max(500).optional(),
  customBody: z.string().optional(),
  previewPayload: z.record(z.string(), z.any()).optional(),
  recipientFilter: z.record(z.string(), z.any()).optional(),
  urgency: z.number().int().min(1).max(5).optional(),
});

export async function GET(request: NextRequest) {
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
    return forbidden("Insufficient permissions to view mail requests");
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");

  try {
    const requests = await db.mailRequest.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            subject: true,
            bodyHtml: true,
            bodyText: true,
            status: true,
            variables: true,
            updatedAt: true,
          },
        },
      },
    });

    return success(requests);
  } catch (error) {
    console.error("Error fetching mail requests:", error);
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
    return forbidden("Insufficient permissions to create mail requests");
  }

  const validation = await validateBody(request, createMailRequestSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const mailRequest = await db.mailRequest.create({
      data: {
        ...validation,
        requestedBy: user.id,
        status: "pending",
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "create_mail_request",
      targetType: "mail_request",
      targetId: mailRequest.id,
      meta: { requestType: validation.requestType },
      ...clientInfo,
    });

    return success(mailRequest);
  } catch (error) {
    console.error("Error creating mail request:", error);
    return serverError();
  }
}
