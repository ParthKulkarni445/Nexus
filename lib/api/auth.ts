import { headers } from "next/headers";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

/**
 * Get the current authenticated user from the session/JWT
 * This is a placeholder - implement with NextAuth or your auth solution
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  // TODO: Implement actual authentication
  // This would typically involve:
  // 1. Getting the session from NextAuth
  // 2. Validating JWT token
  // 3. Fetching user from database

  // Placeholder for development
  const headersList = await headers();
  const userId = headersList.get("x-user-id");

  if (!userId) {
    return null;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user || !user.isActive) {
    return null;
  }

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
