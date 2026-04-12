import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import {
  success,
  unauthorized,
  forbidden,
  badRequest,
  serverError,
} from "@/lib/api/response";
import { validateBody } from "@/lib/api/validation";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { headers } from "next/headers";

const createSeasonSchema = z.object({
  seasonType: z.enum(["intern", "placement"]),
  academicYear: z
    .string()
    .regex(/^\d{4}-\d{2}$/i, "Academic year must be in format YYYY-YY"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().default(true),
});

function generateSeasonName(seasonType: "intern" | "placement", academicYear: string) {
  if (seasonType === "intern") {
    return `Intern ${academicYear.slice(0, 4)}`;
  }

  return `Placement ${academicYear}`;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  try {
    const seasons = await db.recruitmentSeason.findMany({
      orderBy: { createdAt: "desc" },
    });

    return success(seasons);
  } catch (error) {
    console.error("Error fetching seasons:", error);
    return serverError();
  }
}

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
    const generatedName = generateSeasonName(
      validation.seasonType,
      validation.academicYear,
    );

    const existingSeason = await db.recruitmentSeason.findFirst({
      where: {
        seasonType: validation.seasonType,
        academicYear: validation.academicYear,
      },
      select: { id: true },
    });

    if (existingSeason) {
      return badRequest("Season already exists for selected type and academic year");
    }

    const season = await db.recruitmentSeason.create({
      data: {
        name: generatedName,
        seasonType: validation.seasonType,
        academicYear: validation.academicYear,
        isActive: validation.isActive,
        startDate: validation.startDate ? new Date(validation.startDate) : null,
        endDate: validation.endDate ? new Date(validation.endDate) : null,
        createdBy: user.id,
      },
    });

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
