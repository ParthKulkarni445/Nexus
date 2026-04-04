CREATE TABLE IF NOT EXISTS "mailbox_sync_states" (
  "mailbox_email" VARCHAR(255) NOT NULL,
  "last_history_id" VARCHAR(255),
  "last_synced_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mailbox_sync_states_pkey" PRIMARY KEY ("mailbox_email")
);
