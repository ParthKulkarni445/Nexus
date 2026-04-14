ALTER TABLE "placements"
  ADD COLUMN "student_entry_number" VARCHAR(20);

ALTER TABLE "placements"
  ALTER COLUMN "student_id" DROP NOT NULL;

CREATE INDEX "placements_student_entry_season_idx"
  ON "placements" ("student_entry_number", "season_id");
