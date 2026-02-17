import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api/response";
import { validateBody } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { companySeasonCycles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";

const createCycleSchema = z.object({
  seasonId: z.string().uuid(),
  status: z.enum(["not_contacted", "contacted", "positive", "accepted", "rejected"]),
  notes: z.string().optional(),
  ownerUserId: z.string().uuid().optional(),
});

/**
 * POST /api/v1/companies/:companyId/season-cycles
 * Create/activate company cycle for a season
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions");
  }

  const { companyId } = await params;
  const validation = await validateBody(request, createCycleSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    // Check if cycle already exists
    const existing = await db.query.companySeasonCycles.findFirst({
      where: and(
        eq(companySeasonCycles.companyId, companyId),
        eq(companySeasonCycles.seasonId, validation.seasonId)
      ),
    });

    if (existing) {
      return badRequest("Company cycle for this season already exists");
    }

    const [cycle] = await db
      .insert(companySeasonCycles)
      .values({
        companyId,
        seasonId: validation.seasonId,
        status: validation.status,
        notes: validation.notes,
        ownerUserId: validation.ownerUserId,
      })
      .returning();

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: "create_company_season_cycle",
      targetType: "company_season_cycle",
      targetId: cycle.id,
      meta: { companyId, seasonId: validation.seasonId },
      ...clientInfo,
    });

    return success(cycle);
  } catch (error) {
    console.error("Error creating season cycle:", error);
    return serverError();
  }
}
