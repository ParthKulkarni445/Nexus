import { pgEnum } from "drizzle-orm/pg-core";

// User roles
export const userRoleEnum = pgEnum("user_role", [
  "tpo_admin",
  "coordinator",
  "student",
  "tech_support",
]);

// Coordinator types (specializations for coordinator role)
export const coordinatorTypeEnum = pgEnum("coordinator_type", [
  "general",
  "student_representative",
  "mailing_team",
]);

// Season related
export const seasonTypeEnum = pgEnum("season_type", ["intern", "placement"]);

export const seasonContactStatusEnum = pgEnum("season_contact_status", [
  "not_contacted",
  "contacted",
  "positive",
  "accepted",
  "rejected",
]);

// Assignment related
export const assignmentItemTypeEnum = pgEnum("assignment_item_type", [
  "company",
  "contact",
]);

// Task related
export const taskMarkerEnum = pgEnum("task_marker", [
  "open",
  "follow_up",
  "flagged",
  "completed",
]);

// Drive related
export const driveStatusEnum = pgEnum("drive_status", [
  "tentative",
  "confirmed",
  "completed",
  "cancelled",
]);

export const applicationStatusEnum = pgEnum("application_status", [
  "applied",
  "shortlisted",
  "interviewed",
  "placed",
  "rejected",
]);

// Mail related
export const mailRequestTypeEnum = pgEnum("mail_request_type", [
  "template",
  "custom",
]);

export const mailRequestStatusEnum = pgEnum("mail_request_status", [
  "pending",
  "approved",
  "scheduled",
  "sent",
  "rejected",
  "cancelled",
]);

export const templateStatusEnum = pgEnum("template_status", [
  "draft",
  "approved",
  "archived",
]);

// Blog related
export const blogModerationStatusEnum = pgEnum("blog_moderation_status", [
  "pending",
  "approved",
  "rejected",
]);

// Email related
export const emailDirectionEnum = pgEnum("email_direction", [
  "inbound",
  "outbound",
]);
