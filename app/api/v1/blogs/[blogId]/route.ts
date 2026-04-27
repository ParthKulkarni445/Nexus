import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ blogId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin"])) {
    return forbidden("Only admin can delete blogs");
  }

  const { blogId } = await params;
  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    await db.blog.delete({ where: { id: blogId } });

    await createAuditLog({
      actorId: user.id,
      action: "delete_blog",
      targetType: "blog",
      targetId: blogId,
      ...clientInfo,
    });

    return success({ blogId });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return notFound("Blog not found");
    }

    console.error("Error deleting blog:", error);
    return serverError();
  }
}
