import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser, hasRoleOrCoordinatorType } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from "@/lib/api/response";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { headers } from "next/headers";

export async function POST(
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
    return forbidden("Only mailing team or student representatives can approve templates");
  }

  const { templateId } = await params;
  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const approvedTemplate = await db.emailTemplate.update({
      where: { id: templateId },
      data: {
        status: "approved",
        approvedBy: user.id,
        updatedAt: new Date(),
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "approve_email_template",
      targetType: "email_template",
      targetId: templateId,
      ...clientInfo,
    });

    return success(approvedTemplate);
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return notFound("Template not found");
    }

    console.error("Error approving template:", error);
    return serverError();
  }
}
