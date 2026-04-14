export type UserRole = "tpo_admin" | "coordinator" | "student" | "tech_support";

export type CoordinatorType =
  | "general"
  | "student_representative"
  | "mailing_team";

export type RbacIdentity = {
  role?: string | null;
  coordinatorType?: string | null;
};

export type RouteAccessRule = {
  roles?: UserRole[];
  coordinatorTypes?: CoordinatorType[];
};

export type RoutePolicy = {
  route: string;
  label: string;
  rule: RouteAccessRule;
};

export const APP_PROTECTED_PATH_PREFIXES = [
  "/companies",
  "/outreach",
  "/confirmed",
  "/mailing",
  "/assignments",
  "/drives",
  "/blogs",
  "/notifications",
  "/schedule",
  "/admin",
  "/student",
] as const;

export const APP_ROUTE_POLICIES: RoutePolicy[] = [
  {
    route: "/student",
    label: "Student portal",
    rule: {
      roles: ["student"],
    },
  },
  {
    route: "/admin",
    label: "Admin pages",
    rule: {
      roles: ["tpo_admin", "coordinator"],
    },
  },
  {
    route: "/mailing",
    label: "Mailing center",
    rule: {
      roles: ["tpo_admin"],
      coordinatorTypes: ["mailing_team", "student_representative"],
    },
  },
  {
    route: "/assignments",
    label: "Assignments",
    rule: {
      roles: ["tpo_admin"],
      coordinatorTypes: ["student_representative"],
    },
  },
];

export const API_ROUTE_POLICIES: RoutePolicy[] = [
  {
    route: "/api/v1/admin",
    label: "Admin APIs",
    rule: {
      roles: ["tpo_admin"],
    },
  },
  {
    route: "/api/v1/blogs",
    label: "Blog moderation APIs",
    rule: {
      roles: ["tpo_admin", "coordinator"],
    },
  },
  {
    route: "/api/v1/mail/requests",
    label: "Mail request API",
    rule: {
      roles: ["tpo_admin", "coordinator"],
    },
  },
  {
    route: "/api/v1/mail",
    label: "Mailing API",
    rule: {
      roles: ["tpo_admin"],
      coordinatorTypes: ["mailing_team", "student_representative"],
    },
  },
  {
    route: "/api/v1/assignments",
    label: "Assignments API",
    rule: {
      roles: ["tpo_admin"],
      coordinatorTypes: ["student_representative"],
    },
  },
  {
    route: "/api/v1/admin/users",
    label: "Admin user permission management",
    rule: {
      roles: ["tpo_admin"],
    },
  },
];

export function hasRouteAccess(
  identity: RbacIdentity | null | undefined,
  rule: RouteAccessRule,
): boolean {
  if (!identity?.role) return false;

  if (rule.roles?.includes(identity.role as UserRole)) {
    return true;
  }

  if (
    identity.role === "coordinator" &&
    identity.coordinatorType &&
    rule.coordinatorTypes?.includes(identity.coordinatorType as CoordinatorType)
  ) {
    return true;
  }

  return false;
}

function matchesPolicy(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function findAppRoutePolicy(pathname: string): RoutePolicy | null {
  return (
    APP_ROUTE_POLICIES.find((policy) => matchesPolicy(pathname, policy.route)) ??
    null
  );
}

export function findApiRoutePolicy(pathname: string): RoutePolicy | null {
  return (
    API_ROUTE_POLICIES.find((policy) => matchesPolicy(pathname, policy.route)) ??
    null
  );
}

export function isProtectedAppPath(pathname: string): boolean {
  return APP_PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function canAccessAppPath(
  pathname: string,
  identity: RbacIdentity | null | undefined,
): boolean {
  const policy = findAppRoutePolicy(pathname);
  if (!policy) return true;
  return hasRouteAccess(identity, policy.rule);
}

export function canAccessApiPath(
  pathname: string,
  identity: RbacIdentity | null | undefined,
): boolean {
  const policy = findApiRoutePolicy(pathname);
  if (!policy) return true;
  return hasRouteAccess(identity, policy.rule);
}
