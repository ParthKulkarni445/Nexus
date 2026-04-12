import { NextRequest } from "next/server";
import { Prisma, UserRole, CoordinatorType } from "@prisma/client";
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
import { hashPassword } from "@/lib/api/session";
import { db } from "@/lib/db";
import { headers } from "next/headers";

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(255),
  email: z.string().trim().email(),
  phone: z.string().trim().max(30).optional(),
  role: z.nativeEnum(UserRole),
  coordinatorType: z.nativeEnum(CoordinatorType).optional(),
  isActive: z.boolean().default(true),
  password: z.string().min(8).max(128).optional(),
});

function canAssignCoordinatorType(
  role: UserRole,
  coordinatorType?: CoordinatorType,
): boolean {
  if (role !== UserRole.coordinator) {
    return coordinatorType === undefined;
  }
  return coordinatorType !== undefined;
}

/**
 * GET /api/v1/admin/users
 * Lists users with custom permissions.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin"])) {
    return forbidden("Only administrators can view user management data");
  }

  const search = request.nextUrl.searchParams.get("search")?.trim();

  try {
    const [users, permissionRows] = await Promise.all([
      db.user.findMany({
        where: search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : undefined,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          coordinatorType: true,
          isActive: true,
          createdAt: true,
          permissions: {
            select: {
              id: true,
              permissionKey: true,
              isAllowed: true,
              grantedAt: true,
            },
            orderBy: { grantedAt: "desc" },
          },
        },
        take: 200,
      }),
      db.userPermission.findMany({
        select: { permissionKey: true },
        distinct: ["permissionKey"],
        orderBy: { permissionKey: "asc" },
      }),
    ]);

    const roles = Object.values(UserRole);
    const coordinatorTypes = Object.values(CoordinatorType);
    const permissionKeys = permissionRows.map((row) => row.permissionKey);

    return success({
      users,
      meta: {
        roles,
        coordinatorTypes,
        permissionKeys,
        coordinatorRole: UserRole.coordinator,
      },
    });
  } catch (error) {
    console.error("Error listing users:", error);
    return serverError();
  }
}

/**
 * POST /api/v1/admin/users
 * Creates a new user account with optional credentials.
 */
export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return unauthorized();
  }

  if (!hasRole(currentUser, ["tpo_admin"])) {
    return forbidden("Only administrators can create users");
  }

  const validation = await validateBody(request, createUserSchema);

  if (validation instanceof Response) {
    return validation;
  }

  if (!canAssignCoordinatorType(validation.role, validation.coordinatorType)) {
    return badRequest(
      validation.role === UserRole.coordinator
        ? "Coordinator type is required for coordinator users"
        : "Coordinator type can only be set for coordinator users",
    );
  }

  try {
    const existing = await db.user.findUnique({
      where: { email: validation.email.toLowerCase() },
      select: { id: true },
    });

    if (existing) {
      return badRequest("A user with this email already exists");
    }

    const passwordHash = validation.password
      ? hashPassword(validation.password)
      : null;

    const created = await db.user.create({
      data: {
        name: validation.name,
        email: validation.email.toLowerCase(),
        phone: validation.phone || null,
        role: validation.role,
        coordinatorType:
          validation.role === UserRole.coordinator
            ? validation.coordinatorType
            : null,
        isActive: validation.isActive,
        authProvider: "credentials",
        profileMeta: passwordHash
          ? ({ passwordHash } as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        coordinatorType: true,
        isActive: true,
      },
    });

    const headersList = await headers();
    const clientInfo = getClientInfo(headersList);

    await createAuditLog({
      actorId: currentUser.id,
      action: "create_user_account",
      targetType: "user",
      targetId: created.id,
      meta: {
        role: created.role,
        coordinatorType: created.coordinatorType,
      },
      ...clientInfo,
    });

    return success(created);
  } catch (error) {
    console.error("Error creating user:", error);
    return serverError();
  }
}
