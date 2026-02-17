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
import { companyContacts, contactInteractions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

const updateContactSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  designation: z.string().max(255).optional(),
  emails: z.array(z.string().email()).optional(),
  phones: z.array(z.string()).optional(),
  preferredContactMethod: z.string().max(50).optional(),
  notes: z.string().optional(),
});

const quickActionSchema = z.object({
  action: z.enum(["call", "email", "note"]),
  summary: z.string().min(1),
  outcome: z.string().optional(),
  nextFollowUpAt: z.string().datetime().optional(),
});

/**
 * PUT /api/v1/contacts/:contactId
 * Update contact details
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator", "student_representative"])) {
    return forbidden("Insufficient permissions to update contacts");
  }

  const { contactId } = await params;
  const validation = await validateBody(request, updateContactSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const [updatedContact] = await db
      .update(companyContacts)
      .set({
        ...validation,
        updatedAt: new Date(),
      })
      .where(eq(companyContacts.id, contactId))
      .returning();

    if (!updatedContact) {
      return notFound("Contact not found");
    }

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: "update_contact",
      targetType: "contact",
      targetId: contactId,
      meta: validation,
      ...clientInfo,
    });

    return success(updatedContact);
  } catch (error) {
    console.error("Error updating contact:", error);
    return serverError();
  }
}

/**
 * DELETE /api/v1/contacts/:contactId
 * Soft delete contact
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions to delete contacts");
  }

  const { contactId } = await params;
  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    await db.delete(companyContacts).where(eq(companyContacts.id, contactId));

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: "delete_contact",
      targetType: "contact",
      targetId: contactId,
      ...clientInfo,
    });

    return success({ message: "Contact deleted successfully" });
  } catch (error) {
    console.error("Error deleting contact:", error);
    return serverError();
  }
}
