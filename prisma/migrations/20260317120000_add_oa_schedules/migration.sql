CREATE TYPE "oa_schedule_status" AS ENUM ('scheduled', 'rescheduled', 'cancelled');

CREATE TABLE "oa_schedules" (
	"id" UUID NOT NULL DEFAULT gen_random_uuid(),
	"company_id" UUID NOT NULL,
	"title" VARCHAR(255) NOT NULL,
	"description" TEXT,
	"start_time" TIMESTAMPTZ(6) NOT NULL,
	"end_time" TIMESTAMPTZ(6) NOT NULL,
	"status" "oa_schedule_status" NOT NULL DEFAULT 'scheduled',
	"created_by" UUID,
	"updated_by" UUID,
	"created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
	"updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
	CONSTRAINT "oa_schedules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "oa_schedules_company_start_idx"
	ON "oa_schedules"("company_id", "start_time");

CREATE INDEX "oa_schedules_status_start_idx"
	ON "oa_schedules"("status", "start_time");

ALTER TABLE "oa_schedules"
	ADD CONSTRAINT "oa_schedules_company_id_fkey"
	FOREIGN KEY ("company_id") REFERENCES "companies"("id")
	ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "oa_schedules"
	ADD CONSTRAINT "oa_schedules_created_by_fkey"
	FOREIGN KEY ("created_by") REFERENCES "users"("id")
	ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "oa_schedules"
	ADD CONSTRAINT "oa_schedules_updated_by_fkey"
	FOREIGN KEY ("updated_by") REFERENCES "users"("id")
	ON DELETE SET NULL ON UPDATE CASCADE;
