CREATE TYPE "ScheduleStatus" AS ENUM ('scheduled', 'rescheduled', 'cancelled');

CREATE TABLE "schedules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "start_time" TIMESTAMPTZ(6) NOT NULL,
  "end_time" TIMESTAMPTZ(6) NOT NULL,
  "status" "ScheduleStatus" NOT NULL DEFAULT 'scheduled',
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "schedules_company_start_idx"
  ON "schedules"("company_id", "start_time");

CREATE INDEX "schedules_status_start_idx"
  ON "schedules"("status", "start_time");

ALTER TABLE "schedules"
  ADD CONSTRAINT "schedules_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "schedules"
  ADD CONSTRAINT "schedules_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "schedules"
  ADD CONSTRAINT "schedules_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
