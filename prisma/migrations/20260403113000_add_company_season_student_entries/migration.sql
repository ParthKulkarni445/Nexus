CREATE TABLE IF NOT EXISTS "company_season_student_entries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_season_cycle_id" UUID NOT NULL,
  "entry_number" VARCHAR(20) NOT NULL,
  "uploaded_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "company_season_student_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "company_season_student_entries_cycle_entry_key" UNIQUE ("company_season_cycle_id", "entry_number"),
  CONSTRAINT "company_season_student_entries_cycle_fkey" FOREIGN KEY ("company_season_cycle_id") REFERENCES "company_season_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "company_season_student_entries_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "company_season_student_entries_cycle_idx"
  ON "company_season_student_entries"("company_season_cycle_id");

CREATE INDEX IF NOT EXISTS "company_season_student_entries_entry_idx"
  ON "company_season_student_entries"("entry_number");
