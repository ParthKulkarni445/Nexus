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

const quickActionSchema = z.object({
  action: z.enum(["call", "email", "note"]),
  summary: z.string().min(1),
  outcome: z.string().optional(),
  nextFollowUpAt: z.string().datetime().optional(),
  companySeasonCycleId: z.string().uuid().optional(),
});

/**
 * POST /api/v1/contacts/:contactId/quick-action
 * Quick log for call/email/note action
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator", "student_representative"])) {
    return forbidden("Insufficient permissions");
  }

  const { contactId } = await params;
  const validation = await validateBody(request, quickActionSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    // Verify contact exists
    const contact = await db.query.companyContacts.findFirst({
      where: eq(companyContacts.id, contactId),
    });

    if (!contact) {
      return notFound("Contact not found");
    }

    // Create interaction log
    const [interaction] = await db
      .insert(contactInteractions)
      .values({
        companyId: contact.companyId,
        contactId,
        companySeasonCycleId: validation.companySeasonCycleId,
        interactionType: validation.action,
        summary: validation.summary,
        outcome: validation.outcome,
        nextFollowUpAt: validation.nextFollowUpAt
          ? new Date(validation.nextFollowUpAt)
          : null,
        createdBy: user.id,
      })
      .returning();

    // Update contact last contacted timestamp
    await db
      .update(companyContacts)
      .set({ lastContactedAt: new Date() })
      .where(eq(companyContacts.id, contactId));

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: `contact_${validation.action}`,
      targetType: "contact",
      targetId: contactId,
      meta: { interactionId: interaction.id },
      ...clientInfo,
    });

    return success(interaction);
  } catch (error) {
    console.error("Error creating quick action:", error);
    return serverError();
  }
}
