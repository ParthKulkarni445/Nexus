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

const rejectSchema = z.object({
  reviewNote: z.string().min(1),
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
    return forbidden("Only mailing team or student representatives can reject requests");
  }

  const { requestId } = await params;
  const validation = await validateBody(request, rejectSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const rejectedRequest = await db.mailRequest.update({
      where: { id: requestId },
      data: {
        status: "rejected",
        reviewedBy: user.id,
        reviewNote: validation.reviewNote,
        updatedAt: new Date(),
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "reject_mail_request",
      targetType: "mail_request",
      targetId: requestId,
      meta: { reviewNote: validation.reviewNote },
      ...clientInfo,
    });

    return success(rejectedRequest);
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return notFound("Mail request not found");
    }

    console.error("Error rejecting mail request:", error);
    return serverError();
  }
}
