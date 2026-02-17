import { NextRequest } from "next/server";
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
import {
  companies,
  companyContacts,
  companyAssignments,
  contactInteractions,
  drives,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { headers } from "next/headers";

const updateCompanySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).optional(),
  domain: z.string().max(255).optional(),
  industry: z.string().max(100).optional(),
  website: z.string().url().max(500).optional(),
  priority: z.number().int().optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/v1/companies/:companyId
 * Company detail with contacts, assignments, recent interactions, linked drives
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const { companyId } = await params;

  try {
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });

    if (!company) {
      return notFound("Company not found");
    }

    // Fetch related data
    const [contacts, assignments, interactions, recentDrives] =
      await Promise.all([
        db.query.companyContacts.findMany({
          where: eq(companyContacts.companyId, companyId),
          orderBy: [desc(companyContacts.createdAt)],
        }),
        db.query.companyAssignments.findMany({
          where: eq(companyAssignments.itemId, companyId),
          with: {
            assigneeUserId: true,
          },
        }),
        db.query.contactInteractions.findMany({
          where: eq(contactInteractions.companyId, companyId),
          orderBy: [desc(contactInteractions.createdAt)],
          limit: 10,
        }),
        db.query.drives.findMany({
          where: eq(drives.companyId, companyId),
          orderBy: [desc(drives.createdAt)],
          limit: 5,
        }),
      ]);

    return success({
      company,
      contacts,
      assignments,
      recentInteractions: interactions,
      recentDrives,
    });
  } catch (error) {
    console.error("Error fetching company:", error);
    return serverError();
  }
}

/**
 * PUT /api/v1/companies/:companyId
 * Update company master attributes
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions to update companies");
  }

  const { companyId } = await params;
  const validation = await validateBody(request, updateCompanySchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const [updatedCompany] = await db
      .update(companies)
      .set({
        ...validation,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId))
      .returning();

    if (!updatedCompany) {
      return notFound("Company not found");
    }

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: "update_company",
      targetType: "company",
      targetId: companyId,
      meta: validation,
      ...clientInfo,
    });

    return success(updatedCompany);
  } catch (error) {
    console.error("Error updating company:", error);
    return serverError();
  }
}

/**
 * DELETE /api/v1/companies/:companyId
 * Soft delete company (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin"])) {
    return forbidden("Only administrators can delete companies");
  }

  const { companyId } = await params;
  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    // Note: Implement soft delete by adding deletedAt column if needed
    // For now, we'll do a hard delete
    await db.delete(companies).where(eq(companies.id, companyId));

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: "delete_company",
      targetType: "company",
      targetId: companyId,
      ...clientInfo,
    });

    return success({ message: "Company deleted successfully" });
  } catch (error) {
    console.error("Error deleting company:", error);
    return serverError();
  }
}
