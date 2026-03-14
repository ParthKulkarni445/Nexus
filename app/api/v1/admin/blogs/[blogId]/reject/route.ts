import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
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
  moderationNote: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ blogId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions");
  }

  const { blogId } = await params;
  const validation = await validateBody(request, rejectSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const rejectedBlog = await db.blog.update({
      where: { id: blogId },
      data: {
        moderationStatus: "rejected",
        moderationNote: validation.moderationNote,
        updatedAt: new Date(),
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "reject_blog",
      targetType: "blog",
      targetId: blogId,
      meta: { note: validation.moderationNote },
      ...clientInfo,
    });

    return success(rejectedBlog);
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return notFound("Blog not found");
    }

    console.error("Error rejecting blog:", error);
    return serverError();
  }
}
