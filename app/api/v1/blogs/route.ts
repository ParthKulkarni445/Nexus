import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  serverError,
} from "@/lib/api/response";
import { validateBody, paginationSchema } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { headers } from "next/headers";

const createBlogSchema = z.object({
  companyId: z.string().uuid(),
  title: z.string().min(1).max(500),
  body: z.string().min(1),
  tags: z.array(z.string()).optional(),
  isAiAssisted: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const params = {
    ...paginationSchema.parse({
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
    }),
    company: searchParams.get("company") || undefined,
  };
  const currentUser = await getCurrentUser();

  try {
    const search = searchParams.get("search") || undefined;
    const tag = searchParams.get("tag") || undefined;

    const where: Prisma.BlogWhereInput = {
      moderationStatus: "approved",
      ...(params.company ? { companyId: params.company } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              {
                company: {
                  name: { contains: search, mode: "insensitive" },
                },
              },
              {
                author: {
                  name: { contains: search, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
      ...(tag ? { tags: { has: tag } } : {}),
    };

    const offset = (params.page - 1) * params.limit;
    const [total, blogsList] = await Promise.all([
      db.blog.count({ where }),
      db.blog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: params.limit,
        skip: offset,
        include: {
          author: { select: { id: true, name: true, role: true } },
          company: { select: { id: true, name: true } },
          votes: { select: { userId: true, voteType: true } },
        },
      }),
    ]);

    const blogsWithVoteSummary = blogsList.map((blog) => {
      const upvoteCount = blog.votes.filter(
        (vote) => vote.voteType === "upvote"
      ).length;
      const downvoteCount = blog.votes.filter(
        (vote) => vote.voteType === "downvote"
      ).length;
      const currentUserVote =
        currentUser
          ? (blog.votes.find((vote) => vote.userId === currentUser.id)
              ?.voteType ?? null)
          : null;

      return {
        id: blog.id,
        title: blog.title,
        body: blog.body,
        tags: blog.tags,
        isAiAssisted: blog.isAiAssisted,
        moderationStatus: blog.moderationStatus,
        moderationNote: blog.moderationNote,
        createdAt: blog.createdAt,
        author: blog.author,
        company: blog.company,
        upvoteCount,
        downvoteCount,
        currentUserVote,
      };
    });

    return success(blogsWithVoteSummary, {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    });
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["student", "tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions to submit blogs");
  }

  const validation = await validateBody(request, createBlogSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);
  const isStudentAuthor = user.role === "student";

  try {
    const blog = await db.blog.create({
      data: {
        ...validation,
        authorId: user.id,
        moderationStatus: isStudentAuthor ? "pending" : "approved",
        approvedBy: isStudentAuthor ? null : user.id,
        approvedAt: isStudentAuthor ? null : new Date(),
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "create_blog",
      targetType: "blog",
      targetId: blog.id,
      meta: { title: blog.title, moderationStatus: blog.moderationStatus },
      ...clientInfo,
    });

    return success(blog);
  } catch (error) {
    console.error("Error creating blog:", error);
    return serverError();
  }
}
