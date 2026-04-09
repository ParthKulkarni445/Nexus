import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasRoleOrCoordinatorType } from "@/lib/api/auth";
import {
  badRequest,
  forbidden,
  notFound,
  serverError,
  success,
  unauthorized,
} from "@/lib/api/response";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { applyThreadCompanyMapping } from "@/lib/mailing/threadMapping";

const updateThreadCompanySchema = z.object({
  companyId: z.string().uuid(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
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
    return forbidden("Insufficient permissions to remap mailbox threads");
  }

  const body = await request.json().catch(() => null);
  const parsed = updateThreadCompanySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid thread-company mapping payload", parsed.error.issues);
  }

  const { threadId } = await params;
  const normalizedThreadId = threadId.trim();
  if (!normalizedThreadId) {
    return badRequest("threadId is required");
  }

  try {
    const [company, existingThreadMailCount] = await Promise.all([
      db.company.findUnique({
        where: { id: parsed.data.companyId },
        select: {
          id: true,
          name: true,
        },
      }),
      db.email.count({
        where: {
          threadId: normalizedThreadId,
        },
      }),
    ]);

    if (!company) {
      return notFound("Company not found");
    }

    if (existingThreadMailCount === 0) {
      return notFound("No mailbox emails were found for this thread");
    }

    const result = await applyThreadCompanyMapping({
      threadId: normalizedThreadId,
      companyId: company.id,
      source: "manual_override",
      confidence: "high",
    });

    const headersList = await headers();
    const clientInfo = getClientInfo(headersList);
    await createAuditLog({
      actorId: user.id,
      action: "override_email_thread_company",
      targetType: "email_thread",
      targetId: normalizedThreadId,
      meta: {
        companyId: company.id,
        companyName: company.name,
        updatedEmails: result.updatedCount,
      },
      ...clientInfo,
    });

    return success({
      threadId: normalizedThreadId,
      company,
      updatedEmails: result.updatedCount,
      source: "manual_override",
      confidence: "high",
    });
  } catch (error) {
    console.error("Error updating email thread company mapping:", error);
    return serverError("Unable to update thread-company mapping");
  }
}
