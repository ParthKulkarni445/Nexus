# RBAC And Permission Matrix

This document describes the current role-based access control (RBAC) model implemented in the app.

## Roles

- `tpo_admin`: full placement-cell administration access.
- `coordinator` + `general`: standard coordinator operations.
- `coordinator` + `student_representative`: coordinator operations + mailing approvals/templates.
- `coordinator` + `mailing_team`: coordinator operations + mailing approvals/templates.
- `student`: student-specific actions such as follow/wishlist and blog submission.
- `tech_support`: authenticated user with no elevated business action permissions yet.

## Effective Access Rules

- Access decision uses `role` first.
- For coordinator subtypes, `coordinatorType` is additionally evaluated for mailing-specific operations.
- Policy source of truth is in `lib/auth/rbac.ts`.
- Authentication and route gates are enforced by `middleware.ts` and route layouts.

## App Route Access

| Route            | Access                                                                       |
| ---------------- | ---------------------------------------------------------------------------- |
| `/companies`     | Any authenticated role                                                       |
| `/outreach`      | Any authenticated role                                                       |
| `/assignments`   | `tpo_admin` OR `coordinator` with `student_representative`                   |
| `/drives`        | Any authenticated role                                                       |
| `/blogs`         | Any authenticated role                                                       |
| `/notifications` | Any authenticated role                                                       |
| `/mailing`       | `tpo_admin` OR `coordinator` with `mailing_team` or `student_representative` |

## API Permission Matrix (Current)

### Core placement operations

| Capability                                              | Allowed roles                                            |
| ------------------------------------------------------- | -------------------------------------------------------- |
| Create/update companies, contacts, drives, interactions | `tpo_admin`, `coordinator`                               |
| Create assignments                                      | `tpo_admin`, `coordinator` with `student_representative` |
| Delete company                                          | `tpo_admin`                                              |
| Create season                                           | `tpo_admin`                                              |
| Reassign assignments                                    | `tpo_admin`, `coordinator` with `student_representative` |

### Mailing operations

| Capability                     | Allowed roles                                                              |
| ------------------------------ | -------------------------------------------------------------------------- |
| Create mail request            | `tpo_admin`, `coordinator` with `mailing_team` or `student_representative` |
| Approve/reject mail request    | `tpo_admin`, `coordinator` with `mailing_team` or `student_representative` |
| Create/update/delete templates | `tpo_admin`, `coordinator` with `mailing_team` or `student_representative` |
| Approve template               | `tpo_admin`, `coordinator` with `mailing_team` or `student_representative` |

### Blogs and student actions

| Capability                                  | Allowed roles                         |
| ------------------------------------------- | ------------------------------------- |
| Submit blog                                 | `student`, `coordinator`, `tpo_admin` |
| Moderate/approve/reject blogs               | `coordinator`, `tpo_admin`            |
| Follow/unfollow company (`wishlist/toggle`) | `student`                             |

### Admin controls

| Capability                                                      | Allowed roles |
| --------------------------------------------------------------- | ------------- |
| Manage user permissions (`/api/v1/admin/users/.../permissions`) | `tpo_admin`   |

## Enforcement Layers

- `middleware.ts`
  - Blocks unauthenticated access to protected app routes.
  - Blocks unauthorized access to RBAC-restricted app routes.
  - Protects API routes from unauthenticated access and applies strict admin-user policy checks.
- `app/(portal)/mailing/layout.tsx`
  - Server-side guard for mailing route.
  - Prevents UI-level bypasses by enforcing route authorization before rendering the page.

## UserPermission Table Notes

- Table: `user_permissions`
- Exposed in `/api/v1/auth/me`
- Currently available for management and introspection.
- Fine-grained dynamic permission enforcement can be layered on top of the role baseline in a later step.
