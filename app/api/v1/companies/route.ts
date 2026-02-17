import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  serverError,
} from "@/lib/api/response";
import { validateBody, paginationSchema, searchSchema } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { like, or, desc, sql } from "drizzle-orm";
import { headers } from "next/headers";

const listCompaniesSchema = paginationSchema.merge(searchSchema).extend({
  industry: z.string().optional(),
});

const createCompanySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  domain: z.string().max(255).optional(),
  industry: z.string().max(100).optional(),
  website: z.string().url().max(500).optional(),
  priority: z.number().int().optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/v1/companies
 * List companies with search, industry, page, limit filters
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const searchParams = request.nextUrl.searchParams;
  const params = listCompaniesSchema.parse({
    page: searchParams.get("page") || "1",
    limit: searchParams.get("limit") || "20",
    search: searchParams.get("search") || undefined,
    industry: searchParams.get("industry") || undefined,
  });

  try {
    // Build query conditions
    const conditions = [];

    if (params.search) {
      conditions.push(
        or(
          like(companies.name, `%${params.search}%`),
          like(companies.domain, `%${params.search}%`)
        )
      );
    }

    if (params.industry) {
      conditions.push(like(companies.industry, `%${params.industry}%`));
    }

    // Count total
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(companies)
      .where(conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined);

    // Fetch companies
    const offset = (params.page - 1) * params.limit;
    const companiesList = await db
      .select()
      .from(companies)
      .where(conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined)
      .orderBy(desc(companies.createdAt))
      .limit(params.limit)
      .offset(offset);

    return success(companiesList, {
      page: params.page,
      limit: params.limit,
      total: count,
      totalPages: Math.ceil(count / params.limit),
    });
  } catch (error) {
    console.error("Error listing companies:", error);
    return serverError();
  }
}

/**
 * POST /api/v1/companies
 * Create company master record
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions to create companies");
  }

  const validation = await validateBody(request, createCompanySchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const [company] = await db
      .insert(companies)
      .values({
        ...validation,
        createdBy: user.id,
      })
      .returning();

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: "create_company",
      targetType: "company",
      targetId: company.id,
      meta: { name: company.name },
      ...clientInfo,
    });

    return success(company);
  } catch (error: any) {
    if (error.code === "23505") {
      // Unique constraint violation
      return serverError("Company with this slug already exists");
    }
    console.error("Error creating company:", error);
    return serverError();
  }
}
