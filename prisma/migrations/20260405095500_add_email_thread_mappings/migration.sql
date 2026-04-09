CREATE TABLE "email_thread_mappings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_id" VARCHAR(255) NOT NULL,
    "company_id" UUID NOT NULL,
    "source" VARCHAR(50) NOT NULL,
    "confidence" VARCHAR(50),
    "last_resolved_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_thread_mappings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_thread_mappings_thread_id_key"
ON "email_thread_mappings"("thread_id");

CREATE INDEX "email_thread_mappings_company_updated_idx"
ON "email_thread_mappings"("company_id", "updated_at");

ALTER TABLE "email_thread_mappings"
ADD CONSTRAINT "email_thread_mappings_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
