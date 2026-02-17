import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  boolean,
  timestamp,
  jsonb,
  unique,
  integer,
} from "drizzle-orm/pg-core";
import {
  seasonTypeEnum,
  seasonContactStatusEnum,
  driveStatusEnum,
  applicationStatusEnum,
  taskMarkerEnum,
} from "../enums";
import { users } from "./users";
import { companies } from "./companies";

export const recruitmentSeasons = pgTable("recruitment_seasons", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(), // e.g., "2026 Summer Internship"
  seasonType: seasonTypeEnum("season_type").notNull(),
  academicYear: varchar("academic_year", { length: 20 }).notNull(), // e.g., "2026-27"
  startDate: date("start_date"),
  endDate: date("end_date"),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const companySeasonCycles = pgTable(
  "company_season_cycles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => recruitmentSeasons.id, { onDelete: "cascade" }),
    status: seasonContactStatusEnum("status").notNull(),
    lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
    ownerUserId: uuid("owner_user_id").references(() => users.id),
    nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    companyCycleUnique: unique().on(table.companyId, table.seasonId),
  })
);

export const companySeasonStatusHistory = pgTable(
  "company_season_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companySeasonCycleId: uuid("company_season_cycle_id")
      .notNull()
      .references(() => companySeasonCycles.id, { onDelete: "cascade" }),
    fromStatus: seasonContactStatusEnum("from_status"),
    toStatus: seasonContactStatusEnum("to_status").notNull(),
    changedBy: uuid("changed_by")
      .notNull()
      .references(() => users.id),
    changeNote: text("change_note"),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  }
);

export const contactInteractions = pgTable("contact_interactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id"), // Reference to company_contacts, nullable
  companySeasonCycleId: uuid("company_season_cycle_id").references(
    () => companySeasonCycles.id,
    { onDelete: "cascade" }
  ),
  interactionType: varchar("interaction_type", { length: 50 }).notNull(), // call, email, meeting, note
  outcome: varchar("outcome", { length: 255 }),
  summary: text("summary"),
  nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const coordinatorTaskMarks = pgTable("coordinator_task_marks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id"), // Reference to company_contacts, nullable
  companySeasonCycleId: uuid("company_season_cycle_id").references(
    () => companySeasonCycles.id,
    { onDelete: "cascade" }
  ),
  marker: taskMarkerEnum("marker").notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }),
  note: text("note"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const drives = pgTable("drives", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  companySeasonCycleId: uuid("company_season_cycle_id")
    .notNull()
    .references(() => companySeasonCycles.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  stage: varchar("stage", { length: 50 }).notNull(), // oa, interview, hr, final, other
  status: driveStatusEnum("status").notNull(),
  venue: varchar("venue", { length: 255 }),
  startAt: timestamp("start_at", { withTimezone: true }),
  endAt: timestamp("end_at", { withTimezone: true }),
  isConflictFlagged: boolean("is_conflict_flagged").default(false),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const driveParticipants = pgTable("drive_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  driveId: uuid("drive_id")
    .notNull()
    .references(() => drives.id, { onDelete: "cascade" }),
  studentId: uuid("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: applicationStatusEnum("status").notNull(),
  score: integer("score"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const studentCompanyFollows = pgTable(
  "student_company_follows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    studentCompanyUnique: unique().on(table.studentId, table.companyId),
  })
);
