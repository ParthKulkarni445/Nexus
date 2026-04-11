ALTER TABLE "company_season_student_entries"
ADD COLUMN "drive_id" UUID;

ALTER TABLE "company_season_student_entries"
ADD CONSTRAINT "company_season_student_entries_drive_fkey"
FOREIGN KEY ("drive_id") REFERENCES "drives"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_season_student_entries"
DROP CONSTRAINT IF EXISTS "company_season_student_entries_cycle_entry_key";

DROP INDEX IF EXISTS "company_season_student_entries_cycle_entry_key";

CREATE UNIQUE INDEX "company_season_student_entries_cycle_drive_entry_key"
ON "company_season_student_entries"("company_season_cycle_id", "drive_id", "entry_number");

CREATE INDEX "company_season_student_entries_drive_idx"
ON "company_season_student_entries"("drive_id");
