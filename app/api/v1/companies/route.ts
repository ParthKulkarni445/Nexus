import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  badRequest,
  serverError,
} from "@/lib/api/response";
import {
  validateBody,
  paginationSchema,
  searchSchema,
} from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
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

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const searchParams = request.nextUrl.searchParams;
  const parsed = listCompaniesSchema.safeParse({
    page: searchParams.get("page") || "1",
    limit: searchParams.get("limit") || "20",
    search: searchParams.get("search") || undefined,
    industry: searchParams.get("industry") || undefined,
  });

  if (!parsed.success) {
    return badRequest("Invalid query parameters", parsed.error.issues);
  }

  const params = parsed.data;

  try {
    const where: Prisma.CompanyWhereInput = {
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: "insensitive" } },
              { domain: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(params.industry
        ? {
            industry: { contains: params.industry, mode: "insensitive" },
          }
        : {}),
    };

    const offset = (params.page - 1) * params.limit;
    const [total, companiesList] = await Promise.all([
      db.company.count({ where }),
      db.company.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: params.limit,
        skip: offset,
      }),
    ]);

    if (companiesList.length === 0) {
      return success([], {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      });
    }

    const companyIds = companiesList.map((company) => company.id);

    const [contactCountRows, cycleRows, interactionRows] = await Promise.all([
      db.companyContact.groupBy({
        by: ["companyId"],
        where: { companyId: { in: companyIds } },
        _count: { _all: true },
        _max: { updatedAt: true },
      }),
      db.companySeasonCycle.findMany({
        where: { companyId: { in: companyIds } },
        select: {
          companyId: true,
          status: true,
          ownerUserId: true,
          updatedBy: true,
          updatedField: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
      }),
      db.contactInteraction.groupBy({
        by: ["companyId"],
        where: { companyId: { in: companyIds } },
        _max: { createdAt: true },
      }),
    ]);

    const contactsByCompany = new Map<string, number>();
    const latestContactUpdateByCompany = new Map<string, Date>();
    for (const row of contactCountRows) {
      contactsByCompany.set(row.companyId, row._count._all);
      if (row._max.updatedAt) {
        latestContactUpdateByCompany.set(row.companyId, row._max.updatedAt);
      }
    }

    const latestInteractionByCompany = new Map<string, Date>();
    for (const row of interactionRows) {
      if (row._max.createdAt) {
        latestInteractionByCompany.set(row.companyId, row._max.createdAt);
      }
    }

    const latestCycleByCompany = new Map<string, (typeof cycleRows)[number]>();
    for (const row of cycleRows) {
      if (!latestCycleByCompany.has(row.companyId)) {
        latestCycleByCompany.set(row.companyId, row);
      }
    }

    const userIds = new Set<string>();
    for (const row of cycleRows) {
      if (row.updatedBy) {
        userIds.add(row.updatedBy);
      }
      if (row.ownerUserId) {
        userIds.add(row.ownerUserId);
      }
    }

    const usersById = new Map<string, string>();
    if (userIds.size > 0) {
      const userRows = await db.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: { id: true, name: true },
      });

      for (const row of userRows) {
        usersById.set(row.id, row.name);
      }
    }

    const now = new Date();

    const enrichedCompanies = companiesList.map((company) => {
      const cycle = latestCycleByCompany.get(company.id);

      let lastUpdated = company.updatedAt;
      let updatedField = "company";
      let lastUpdatedBy = "System";

      if (cycle && cycle.updatedAt <= now && cycle.updatedAt > lastUpdated) {
        lastUpdated = cycle.updatedAt;
        updatedField = cycle.updatedField ?? "status";
        lastUpdatedBy = cycle.updatedBy
          ? (usersById.get(cycle.updatedBy) ?? "System")
          : cycle.ownerUserId
            ? (usersById.get(cycle.ownerUserId) ?? "System")
            : "System";
      }

      const latestContactUpdate = latestContactUpdateByCompany.get(company.id);
      if (latestContactUpdate && latestContactUpdate <= now && latestContactUpdate > lastUpdated) {
        lastUpdated = latestContactUpdate;
        updatedField = "contact";
        lastUpdatedBy = "System";
      }

      const latestInteraction = latestInteractionByCompany.get(company.id);
      if (latestInteraction && latestInteraction <= now && latestInteraction > lastUpdated) {
        lastUpdated = latestInteraction;
        updatedField = "interaction";
        lastUpdatedBy = "System";
      }

      const assignedTo = cycle?.ownerUserId
        ? (usersById.get(cycle.ownerUserId) ?? "Unassigned")
        : "Unassigned";

      return {
        ...company,
        currentStatus: cycle?.status ?? "not_contacted",
        contactsCount: contactsByCompany.get(company.id) ?? 0,
        assignedTo,
        lastUpdated,
        lastUpdatedBy,
        updatedField,
      };
    });

    return success(enrichedCompanies, {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    });
  } catch (error) {
    console.error("Error listing companies:", error);
    return serverError();
  }
}

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
    const company = await db.company.create({
      data: {
        ...validation,
        createdBy: user.id,
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "create_company",
      targetType: "company",
      targetId: company.id,
      meta: { name: company.name },
      ...clientInfo,
    });

    return success(company);
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return serverError("Company with this slug already exists");
    }

    console.error("Error creating company:", error);
    return serverError();
  }
}
