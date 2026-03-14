import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasRoleOrCoordinatorType } from "@/lib/api/auth";
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
import { headers } from "next/headers";

const quickActionSchema = z.object({
  action: z.enum(["call", "email", "note"]),
  summary: z.string().min(1),
  outcome: z.string().optional(),
  nextFollowUpAt: z.string().datetime().optional(),
  companySeasonCycleId: z.string().uuid().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRoleOrCoordinatorType(user, ["tpo_admin", "coordinator"])) {
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
    const contact = await db.companyContact.findUnique({
      where: { id: contactId },
      select: { companyId: true },
    });

    if (!contact) {
      return notFound("Contact not found");
    }

    const interaction = await db.contactInteraction.create({
      data: {
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
      },
    });

    await db.companyContact.update({
      where: { id: contactId },
      data: { lastContactedAt: new Date() },
    });

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
