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
  mailRequestTypeEnum,
  mailRequestStatusEnum,
  templateStatusEnum,
  emailDirectionEnum,
} from "../enums";
import { users } from "./users";
import { companies } from "./companies";
import { companySeasonCycles } from "./recruitment";
import { drives } from "./recruitment";

export const emailTemplates = pgTable("email_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  subject: varchar("subject", { length: 500 }).notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text"),
  variables: text("variables").array(), // List of template variables
  sendPolicy: jsonb("send_policy"), // Rate limits, approval requirements
  status: templateStatusEnum("status").notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  approvedBy: uuid("approved_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const emailTemplateVersions = pgTable(
  "email_template_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => emailTemplates.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    subject: varchar("subject", { length: 500 }).notNull(),
    bodyHtml: text("body_html").notNull(),
    bodyText: text("body_text"),
    variables: text("variables").array(),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    templateVersionUnique: unique().on(table.templateId, table.version),
  })
);

export const mailRequests = pgTable("mail_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id, {
    onDelete: "cascade",
  }),
  requestedBy: uuid("requested_by")
    .notNull()
    .references(() => users.id),
  companySeasonCycleId: uuid("company_season_cycle_id").references(
    () => companySeasonCycles.id,
    { onDelete: "cascade" }
  ),
  requestType: mailRequestTypeEnum("request_type").notNull(),
  templateId: uuid("template_id").references(() => emailTemplates.id),
  templateVersion: integer("template_version"),
  customSubject: varchar("custom_subject", { length: 500 }),
  customBody: text("custom_body"),
  recipientFilter: jsonb("recipient_filter"), // Branch/year/eligibility/tags
  previewPayload: jsonb("preview_payload"),
  status: mailRequestStatusEnum("status").notNull(),
  urgency: integer("urgency"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewNote: text("review_note"),
  sendAt: timestamp("send_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const emails = pgTable("emails", {
  id: uuid("id").primaryKey().defaultRandom(),
  direction: emailDirectionEnum("direction").notNull(),
  messageId: varchar("message_id", { length: 500 }).notNull().unique(),
  mailRequestId: uuid("mail_request_id").references(() => mailRequests.id),
  templateId: uuid("template_id").references(() => emailTemplates.id),
  templateVersion: integer("template_version"),
  companyId: uuid("company_id").references(() => companies.id),
  driveId: uuid("drive_id").references(() => drives.id),
  companySeasonCycleId: uuid("company_season_cycle_id").references(
    () => companySeasonCycles.id
  ),
  fromEmail: varchar("from_email", { length: 255 }).notNull(),
  toEmails: text("to_emails").array().notNull(),
  ccEmails: text("cc_emails").array(),
  subject: varchar("subject", { length: 1000 }),
  textBody: text("text_body"),
  htmlBody: text("html_body"),
  inReplyTo: varchar("in_reply_to", { length: 500 }),
  references: text("references").array(),
  threadId: varchar("thread_id", { length: 500 }),
  headers: jsonb("headers"),
  classification: jsonb("classification"), // Auto-categorization
  providerStatus: varchar("provider_status", { length: 100 }),
  providerEventAt: timestamp("provider_event_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const emailAttachments = pgTable("email_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  emailId: uuid("email_id")
    .notNull()
    .references(() => emails.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  sizeBytes: integer("size_bytes"),
  storagePath: varchar("storage_path", { length: 1000 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const blockedDomains = pgTable("blocked_domains", {
  domain: varchar("domain", { length: 255 }).primaryKey(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const emailSuppressionList = pgTable("email_suppression_list", {
  email: varchar("email", { length: 255 }).primaryKey(),
  reason: varchar("reason", { length: 50 }).notNull(), // bounce, complaint, manual
  sourceEventId: varchar("source_event_id", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
