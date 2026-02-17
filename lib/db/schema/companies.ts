import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import {
  seasonContactStatusEnum,
  assignmentItemTypeEnum,
  assignmentRoleEnum,
} from "../enums";
import { users } from "./users";

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  domain: varchar("domain", { length: 255 }),
  industry: varchar("industry", { length: 100 }),
  website: varchar("website", { length: 500 }),
  priority: integer("priority"),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const companyContacts = pgTable("company_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  designation: varchar("designation", { length: 255 }),
  emails: text("emails").array(),
  phones: text("phones").array(),
  preferredContactMethod: varchar("preferred_contact_method", { length: 50 }),
  notes: text("notes"),
  lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const companyAssignments = pgTable("company_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemType: assignmentItemTypeEnum("item_type").notNull(),
  itemId: uuid("item_id").notNull(), // Reference to company or contact id
  assigneeUserId: uuid("assignee_user_id")
    .notNull()
    .references(() => users.id),
  assignedBy: uuid("assigned_by").references(() => users.id),
  assignmentRole: assignmentRoleEnum("assignment_role").notNull(),
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  assignedAt: timestamp("assigned_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const companyAssignmentHistory = pgTable("company_assignment_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  assignmentId: uuid("assignment_id")
    .notNull()
    .references(() => companyAssignments.id, { onDelete: "cascade" }),
  fromUserId: uuid("from_user_id").references(() => users.id),
  toUserId: uuid("to_user_id").references(() => users.id),
  changedBy: uuid("changed_by")
    .notNull()
    .references(() => users.id),
  reason: text("reason"),
  changedAt: timestamp("changed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const companyDomains = pgTable(
  "company_domains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    domain: varchar("domain", { length: 255 }).notNull(),
    confidence: varchar("confidence", { length: 50 }).notNull(), // manual, verified, learned
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    companyDomainUnique: unique().on(table.companyId, table.domain),
  })
);

export const companyYearlyStats = pgTable("company_yearly_stats", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  totalHired: integer("total_hired"),
  avgCtcLpa: integer("avg_ctc_lpa"),
  maxCtcLpa: integer("max_ctc_lpa"),
  rolesHired: text("roles_hired").array(),
  sourceNote: text("source_note"),
});
