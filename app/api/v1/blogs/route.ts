import { NextRequest } from "next/server";
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
import { blogs } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { headers } from "next/headers";

const createBlogSchema = z.object({
  companyId: z.string().uuid(),
  title: z.string().min(1).max(500),
  body: z.string().min(1),
  tags: z.array(z.string()).optional(),
  isAiAssisted: z.boolean().default(false),
});

/**
 * GET /api/v1/blogs
 * Browse approved blogs with filters (company, tag, page)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const params = {
    ...paginationSchema.parse({
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
    }),
    company: searchParams.get("company") || undefined,
    tag: searchParams.get("tag") || undefined,
  };

  try {
    const conditions = [eq(blogs.moderationStatus, "approved")];

    if (params.company) {
      conditions.push(eq(blogs.companyId, params.company));
    }

    // Count total
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(blogs)
      .where(and(...conditions));

    // Fetch blogs
    const offset = (params.page - 1) * params.limit;
    const blogsList = await db
      .select()
      .from(blogs)
      .where(and(...conditions))
      .orderBy(desc(blogs.createdAt))
      .limit(params.limit)
      .offset(offset);

    return success(blogsList, {
      page: params.page,
      limit: params.limit,
      total: count,
      totalPages: Math.ceil(count / params.limit),
    });
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return serverError();
  }
}

/**
 * POST /api/v1/blogs
 * Student submits blog draft
 */
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

  try {
    const [blog] = await db
      .insert(blogs)
      .values({
        ...validation,
        authorId: user.id,
        moderationStatus: "pending",
      })
      .returning();

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: "create_blog",
      targetType: "blog",
      targetId: blog.id,
      meta: { title: blog.title },
      ...clientInfo,
    });

    return success(blog);
  } catch (error) {
    console.error("Error creating blog:", error);
    return serverError();
  }
}
