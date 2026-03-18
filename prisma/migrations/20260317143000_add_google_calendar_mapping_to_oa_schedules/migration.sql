ALTER TABLE "oa_schedules"
  ADD COLUMN "google_event_id" VARCHAR(255),
  ADD COLUMN "google_etag" VARCHAR(255),
  ADD COLUMN "google_updated_at" TIMESTAMPTZ(6),
  ADD COLUMN "last_synced_at" TIMESTAMPTZ(6);

CREATE UNIQUE INDEX "oa_schedules_google_event_id_key"
  ON "oa_schedules"("google_event_id");
