-- Create table for uploaded mail assets
CREATE TABLE IF NOT EXISTS "mail_assets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "file_name" VARCHAR(255) NOT NULL,
  "mime_type" VARCHAR(255),
  "size_bytes" INTEGER,
  "storage_path" VARCHAR(500) NOT NULL,
  "public_url" VARCHAR(500) NOT NULL,
  "uploaded_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mail_assets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mail_assets_storage_path_key" UNIQUE ("storage_path"),
  CONSTRAINT "mail_assets_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "mail_assets_created_idx" ON "mail_assets"("created_at");

-- Create join table for template default attachments
CREATE TABLE IF NOT EXISTS "email_template_attachments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "template_id" UUID NOT NULL,
  "mail_asset_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_template_attachments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "email_template_attachments_unique" UNIQUE ("template_id", "mail_asset_id"),
  CONSTRAINT "email_template_attachments_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "email_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "email_template_attachments_mail_asset_id_fkey" FOREIGN KEY ("mail_asset_id") REFERENCES "mail_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "email_template_attachments_template_created_idx" ON "email_template_attachments"("template_id", "created_at");

-- Create join table for request-level attachments
CREATE TABLE IF NOT EXISTS "mail_request_attachments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "mail_request_id" UUID NOT NULL,
  "mail_asset_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mail_request_attachments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mail_request_attachments_unique" UNIQUE ("mail_request_id", "mail_asset_id"),
  CONSTRAINT "mail_request_attachments_mail_request_id_fkey" FOREIGN KEY ("mail_request_id") REFERENCES "mail_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "mail_request_attachments_mail_asset_id_fkey" FOREIGN KEY ("mail_asset_id") REFERENCES "mail_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "mail_request_attachments_request_created_idx" ON "mail_request_attachments"("mail_request_id", "created_at");
