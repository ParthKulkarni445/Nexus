import { NextRequest } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import { success, unauthorized, forbidden, serverError, notFound } from "@/lib/api/response";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { z } from "zod";
import { validateBody } from "@/lib/api/validation";
import { badRequest } from "@/lib/api/response";

const updateSeasonSchema = z.object({
  isActive: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin"])) {
    return forbidden("Only administrators can update seasons");
  }

  const validation = await validateBody(request, updateSeasonSchema);

  if (validation instanceof Response) {
    return validation;
  }

  const { id } = await params;
  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const existingSeason = await db.recruitmentSeason.findUnique({
      where: { id },
    });

    if (!existingSeason) {
      return notFound("Season not found");
    }

    const updatedSeason = await db.recruitmentSeason.update({
      where: { id },
      data: {
        isActive: validation.isActive,
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "update_season",
      targetType: "season",
      targetId: id,
      meta: { name: existingSeason.name, type: existingSeason.seasonType, previousIsActive: existingSeason.isActive, newIsActive: validation.isActive },
      ...clientInfo,
    });

    return success(updatedSeason);
  } catch (error) {
    console.error("Error updating season:", error);
    return serverError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin"])) {
    return forbidden("Only administrators can delete seasons");
  }

  const { id } = await params;
  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    const existingSeason = await db.recruitmentSeason.findUnique({
      where: { id },
    });

    if (!existingSeason) {
      return notFound("Season not found");
    }

    await db.recruitmentSeason.delete({
      where: { id },
    });

    await createAuditLog({
      actorId: user.id,
      action: "delete_season",
      targetType: "season",
      targetId: id,
      meta: { name: existingSeason.name, type: existingSeason.seasonType },
      ...clientInfo,
    });

    return success({ success: true });
  } catch (error) {
    console.error("Error deleting season:", error);
    return serverError();
  }
}
