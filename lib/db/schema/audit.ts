import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { blogModerationStatusEnum } from "../enums";
import { users } from "./users";
import { companies } from "./companies";

export const blogs = pgTable("blogs", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  body: text("body").notNull(),
  tags: text("tags").array(),
  isAiAssisted: boolean("is_ai_assisted").default(false),
  moderationStatus: blogModerationStatusEnum("moderation_status").notNull(),
  moderationNote: text("moderation_note"),
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  payload: jsonb("payload"),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const exportsAudit = pgTable("exports_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => users.id),
  exportType: varchar("export_type", { length: 100 }).notNull(), // contacts, drives, placements, mailing
  format: varchar("format", { length: 20 }).notNull(), // csv, xlsx
  filters: jsonb("filters"),
  recordCount: integer("record_count"),
  purposeNote: text("purpose_note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const aiGenerations = pgTable("ai_generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 50 }).notNull(), // email, blog
  requestedBy: uuid("requested_by")
    .notNull()
    .references(() => users.id),
  input: jsonb("input").notNull(),
  output: text("output").notNull(),
  model: varchar("model", { length: 100 }),
  approved: boolean("approved").default(false),
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id),
  action: varchar("action", { length: 255 }).notNull(),
  targetType: varchar("target_type", { length: 100 }),
  targetId: uuid("target_id"),
  meta: jsonb("meta"),
  ipAddress: varchar("ip_address", { length: 100 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
