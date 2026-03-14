import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
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
import { headers } from "next/headers";

const approveSchema = z.object({
  sendAt: z.string().datetime().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
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
    return forbidden("Only mailing team or student representatives can approve requests");
  }

  const { requestId } = await params;
  const validation = await validateBody(request, approveSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const approvedRequest = await db.mailRequest.update({
      where: { id: requestId },
      data: {
        status: "queued",
        reviewedBy: user.id,
        sendAt: validation.sendAt ? new Date(validation.sendAt) : null,
        updatedAt: new Date(),
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "approve_mail_request",
      targetType: "mail_request",
      targetId: requestId,
      meta: { sendAt: validation.sendAt },
      ...clientInfo,
    });

    return success(approvedRequest);
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return notFound("Mail request not found");
    }

    console.error("Error approving mail request:", error);
    return serverError();
  }
}
