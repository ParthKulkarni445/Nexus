import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  notFound,
  serverError,
} from "@/lib/api/response";
import { validateBody } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { headers } from "next/headers";

const voteSchema = z.object({
  voteType: z.enum(["upvote", "downvote"]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ blogId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const { blogId } = await params;
  const validation = await validateBody(request, voteSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const blog = await db.blog.findUnique({
      where: { id: blogId },
      select: { id: true, moderationStatus: true },
    });

    if (!blog || blog.moderationStatus !== "approved") {
      return notFound("Blog not found");
    }

    const existingVote = await db.blogVote.findUnique({
      where: {
        blogId_userId: {
          blogId,
          userId: user.id,
        },
      },
    });

    let currentUserVote: "upvote" | "downvote" | null = validation.voteType;

    if (existingVote && existingVote.voteType === validation.voteType) {
      await db.blogVote.delete({ where: { id: existingVote.id } });
      currentUserVote = null;
    } else if (existingVote) {
      await db.blogVote.update({
        where: { id: existingVote.id },
        data: {
          voteType: validation.voteType,
          updatedAt: new Date(),
        },
      });
    } else {
      await db.blogVote.create({
        data: {
          blogId,
          userId: user.id,
          voteType: validation.voteType,
        },
      });
    }

    const [upvoteCount, downvoteCount] = await Promise.all([
      db.blogVote.count({ where: { blogId, voteType: "upvote" } }),
      db.blogVote.count({ where: { blogId, voteType: "downvote" } }),
    ]);

    await createAuditLog({
      actorId: user.id,
      action: "vote_blog",
      targetType: "blog",
      targetId: blogId,
      meta: { voteType: currentUserVote },
      ...clientInfo,
    });

    return success({
      blogId,
      upvoteCount,
      downvoteCount,
      currentUserVote,
    });
  } catch (error: unknown) {
    console.error("Error voting on blog:", error);
    return serverError();
  }
}
