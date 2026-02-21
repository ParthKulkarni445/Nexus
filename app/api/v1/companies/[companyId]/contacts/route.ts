import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasRoleOrCoordinatorType } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  serverError,
} from "@/lib/api/response";
import { validateBody } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { companyContacts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { headers } from "next/headers";

const createContactSchema = z.object({
  name: z.string().min(1).max(255),
  designation: z.string().max(255).optional(),
  emails: z.array(z.string().email()).optional(),
  phones: z.array(z.string()).optional(),
  preferredContactMethod: z.string().max(50).optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/v1/companies/:companyId/contacts
 * List contacts for a company
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
    const contacts = await db.query.companyContacts.findMany({
      where: eq(companyContacts.companyId, companyId),
      orderBy: [desc(companyContacts.createdAt)],
    });

    return success(contacts);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return serverError();
  }
}

/**
 * POST /api/v1/companies/:companyId/contacts
 * Add new HR contact
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRoleOrCoordinatorType(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions to create contacts");
  }

  const { companyId } = await params;
  const validation = await validateBody(request, createContactSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const [contact] = await db
      .insert(companyContacts)
      .values({
        companyId,
        ...validation,
      })
      .returning();

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: "create_contact",
      targetType: "contact",
      targetId: contact.id,
      meta: { companyId, name: contact.name },
      ...clientInfo,
    });

    return success(contact);
  } catch (error) {
    console.error("Error creating contact:", error);
    return serverError();
  }
}
