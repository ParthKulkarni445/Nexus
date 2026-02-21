import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { userRoleEnum, coordinatorTypeEnum } from "../enums";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull(),
  coordinatorType: coordinatorTypeEnum("coordinator_type"), // Only for coordinator role
  authProvider: varchar("auth_provider", { length: 100 }),
  authSubject: varchar("auth_subject", { length: 255 }),
  profileMeta: jsonb("profile_meta"), // branch, grad_year, phone, etc.
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const userPermissions = pgTable("user_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  permissionKey: varchar("permission_key", { length: 100 }).notNull(), // e.g., export_contacts, manage_templates
  isAllowed: boolean("is_allowed").notNull(),
  grantedBy: uuid("granted_by").references(() => users.id),
  grantedAt: timestamp("granted_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
