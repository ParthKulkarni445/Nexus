import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
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

const updateContactSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  designation: z.string().max(255).optional(),
  emails: z.array(z.string().email()).optional(),
  phones: z.array(z.string()).optional(),
  preferredContactMethod: z.string().max(50).optional(),
  notes: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRoleOrCoordinatorType(user, ["tpo_admin", "coordinator"])) {
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
    const updatedContact = await db.companyContact.update({
      where: { id: contactId },
      data: {
        ...validation,
        updatedAt: new Date(),
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "update_contact",
      targetType: "contact",
      targetId: contactId,
      meta: validation,
      ...clientInfo,
    });

    return success(updatedContact);
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return notFound("Contact not found");
    }

    console.error("Error updating contact:", error);
    return serverError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRoleOrCoordinatorType(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions to delete contacts");
  }

  const { contactId } = await params;
  const headersList = await headers();
  const clientInfo = getClientInfo(headersList);

  try {
    await db.companyContact.delete({ where: { id: contactId } });

    await createAuditLog({
      actorId: user.id,
      action: "delete_contact",
      targetType: "contact",
      targetId: contactId,
      ...clientInfo,
    });

    return success({ message: "Contact deleted successfully" });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return notFound("Contact not found");
    }

    console.error("Error deleting contact:", error);
    return serverError();
  }
}
