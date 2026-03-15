import { db } from "@/lib/db";
import { getSessionUserClaims } from "@/lib/api/session";

export type UserRole = "tpo_admin" | "coordinator" | "student" | "tech_support";

export type CoordinatorType =
  | "general"
  | "student_representative"
  | "mailing_team";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  coordinatorType?: CoordinatorType;
  isActive: boolean;
}

const TRANSIENT_DB_ERROR_CODES = new Set(["P5010"]);

function isTransientDbError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const maybeCode =
    "code" in error && typeof error.code === "string" ? error.code : "";
  if (TRANSIENT_DB_ERROR_CODES.has(maybeCode)) {
    return true;
  }

  const maybeMessage =
    "message" in error && typeof error.message === "string"
      ? error.message
      : "";

  return (
    maybeMessage.includes("Cannot fetch data from service") ||
    maybeMessage.includes("fetch failed")
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Get the current authenticated user from the session/JWT
 * This is a placeholder - implement with NextAuth or your auth solution
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const sessionUser = await getSessionUserClaims();
  if (!sessionUser?.userId) return null;

  let user = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      user = await db.user.findUnique({
        where: { id: sessionUser.userId },
      });
      break;
    } catch (error) {
      if (attempt === 0 && isTransientDbError(error)) {
        await wait(200);
        continue;
      }
      throw error;
    }
  }

  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    coordinatorType: user.coordinatorType as CoordinatorType | undefined,
    isActive: user.isActive,
  };
}

/**
 * Check if user has required role
 */
export function hasRole(user: AuthUser, roles: UserRole[]): boolean {
  return roles.includes(user.role);
}

/**
 * Check if user is a coordinator with specific type(s)
 */
export function hasCoordinatorType(
  user: AuthUser,
  types: CoordinatorType[]
): boolean {
  return (
    user.role === "coordinator" &&
    user.coordinatorType !== undefined &&
    types.includes(user.coordinatorType)
  );
}

/**
 * Check if user has role OR is coordinator with specific type
 * Useful for checking: tpo_admin OR coordinator with mailing_team type
 */
export function hasRoleOrCoordinatorType(
  user: AuthUser,
  roles: UserRole[],
  coordinatorTypes?: CoordinatorType[]
): boolean {
  if (roles.includes(user.role)) {
    return true;
  }
  if (coordinatorTypes && user.role === "coordinator") {
    return hasCoordinatorType(user, coordinatorTypes);
  }
  return false;
}

/**
 * Check if user has specific permission
 * TODO: Implement permission checking from user_permissions table
 */
export async function hasPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  // TODO: Query user_permissions table
  return true; // Placeholder
}

/**
 * Role-based access control decorator
 */
export function requireRoles(...roles: UserRole[]) {
  return async (user: AuthUser | null) => {
    if (!user) {
      return false;
    }
    return hasRole(user, roles);
  };
}
