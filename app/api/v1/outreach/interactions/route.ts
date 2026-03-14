import { NextRequest } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
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

const createOutreachInteractionSchema = z.object({
  companyId: z.string().uuid(),
  contactId: z.string().uuid().optional(),
  companySeasonCycleId: z.string().uuid().optional(),
  action: z.enum(["call", "email", "note"]),
  summary: z.string().min(1),
  outcome: z.string().optional(),
  nextFollowUpAt: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRoleOrCoordinatorType(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions");
  }

  const validation = await validateBody(request, createOutreachInteractionSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const company = await db.company.findUnique({
      where: { id: validation.companyId },
      select: { id: true },
    });

    if (!company) {
      return notFound("Company not found");
    }

    if (validation.contactId) {
      const contact = await db.companyContact.findUnique({
        where: { id: validation.contactId },
        select: { companyId: true },
      });

      if (!contact || contact.companyId !== validation.companyId) {
        return notFound("Contact not found for this company");
      }
    }

    const interaction = await db.contactInteraction.create({
      data: {
        companyId: validation.companyId,
        contactId: validation.contactId,
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

    await db.companySeasonCycle.updateMany({
      where: { id: validation.companySeasonCycleId },
      data: {
        lastContactedAt: new Date(),
        updatedBy: user.id,
        updatedField: "interaction",
        nextFollowUpAt: validation.nextFollowUpAt
          ? new Date(validation.nextFollowUpAt)
          : undefined,
        updatedAt: new Date(),
      },
    });

    if (validation.contactId) {
      await db.companyContact.update({
        where: { id: validation.contactId },
        data: { lastContactedAt: new Date(), updatedAt: new Date() },
      });
    }

    await createAuditLog({
      actorId: user.id,
      action: `outreach_${validation.action}`,
      targetType: "company",
      targetId: validation.companyId,
      meta: {
        interactionId: interaction.id,
        contactId: validation.contactId,
        companySeasonCycleId: validation.companySeasonCycleId,
      },
      ...clientInfo,
    });

    return success(interaction);
  } catch (error) {
    console.error("Error creating outreach interaction:", error);
    return serverError();
  }
}
