-- Add last_notifications_viewed_at column to users table
ALTER TABLE "users"
ADD COLUMN "last_notifications_viewed_at" TIMESTAMP(6) WITH TIME ZONE;
