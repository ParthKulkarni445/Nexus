import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  serverError,
} from "@/lib/api/response";
import { validateBody } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { recruitmentSeasons } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";

const createSeasonSchema = z.object({
  name: z.string().min(1).max(255),
  seasonType: z.enum(["intern", "placement"]),
  academicYear: z.string().max(20),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().default(true),
});

/**
 * GET /api/v1/seasons
 * List recruitment seasons
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  try {
    const seasons = await db.query.recruitmentSeasons.findMany({
      orderBy: [desc(recruitmentSeasons.createdAt)],
    });

    return success(seasons);
  } catch (error) {
    console.error("Error fetching seasons:", error);
    return serverError();
  }
}

/**
 * POST /api/v1/seasons
 * Create a new recruitment season
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin"])) {
    return forbidden("Only administrators can create seasons");
  }

  const validation = await validateBody(request, createSeasonSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const [season] = await db
      .insert(recruitmentSeasons)
      .values({
        ...validation,
        startDate: validation.startDate || null,
        endDate: validation.endDate || null,
        createdBy: user.id,
      })
      .returning();

    // Create audit log
    await createAuditLog({
      actorId: user.id,
      action: "create_season",
      targetType: "season",
      targetId: season.id,
      meta: { name: season.name, type: season.seasonType },
      ...clientInfo,
    });

    return success(season);
  } catch (error) {
    console.error("Error creating season:", error);
    return serverError();
  }
}
