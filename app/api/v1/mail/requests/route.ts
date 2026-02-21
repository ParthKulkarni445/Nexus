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
import { mailRequests } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { headers } from "next/headers";

const createMailRequestSchema = z.object({
  companyId: z.string().uuid().optional(),
  companySeasonCycleId: z.string().uuid().optional(),
  requestType: z.enum(["template", "custom"]),
  templateId: z.string().uuid().optional(),
  templateVersion: z.number().int().optional(),
  customSubject: z.string().max(500).optional(),
  customBody: z.string().optional(),
  recipientFilter: z.record(z.string(), z.any()).optional(),
  urgency: z.number().int().min(1).max(5).optional(),
});

/**
 * GET /api/v1/mail/requests
 * List mail requests (with status filter for pending queue)
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");

  try {
    let requests;

    if (status) {
      requests = await db
        .select()
        .from(mailRequests)
        .where(eq(mailRequests.status, status as any))
        .orderBy(desc(mailRequests.createdAt));
    } else {
      requests = await db
        .select()
        .from(mailRequests)
        .orderBy(desc(mailRequests.createdAt));
    }

    return success(requests);
  } catch (error) {
    console.error("Error fetching mail requests:", error);
    return serverError();
  }
}

/**
 * POST /api/v1/mail/requests
 * Create mail request (template or custom)
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRoleOrCoordinatorType(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions to create mail requests");
  }

  const validation = await validateBody(request, createMailRequestSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const [mailRequest] = await db
      .insert(mailRequests)
      .values({
        ...validation,
        requestedBy: user.id,
        status: "pending",
      })
      .returning();

    // Create audit log
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
