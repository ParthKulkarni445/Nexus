import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import { badRequest, forbidden, notFound, serverError, success, unauthorized } from "@/lib/api/response";
import { db } from "@/lib/db";

const updateCompensationSchema = z.object({
  packageAmount: z.number().min(0).max(9999),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ driveId: string }> },
) {
  const user = await getCurrentUser();
  const prisma = db as any;

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions to update compensation");
  }

  const { driveId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON request body");
  }

  const validation = updateCompensationSchema.safeParse(body);
  if (!validation.success) {
    return badRequest("Invalid compensation payload", validation.error.flatten());
  }

  const drive = await prisma.drive.findUnique({ where: { id: driveId }, select: { id: true } });

  if (!drive) {
    return notFound("Drive not found");
  }

  try {
    await prisma.drive.update({
      where: { id: driveId },
      data: {
        compensationAmount: validation.data.packageAmount,
        updatedAt: new Date(),
      },
    });

    return success({
      driveId,
      compensationAmount: validation.data.packageAmount,
    });
  } catch (error) {
    console.error("Error updating drive compensation amount:", error);
    return serverError("Unable to update drive compensation");
  }
}
