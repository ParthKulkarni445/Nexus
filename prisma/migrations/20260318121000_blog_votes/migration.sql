DO $$
BEGIN
  CREATE TYPE "blog_vote_type" AS ENUM ('upvote', 'downvote');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS "blog_votes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "blog_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "vote_type" "blog_vote_type" NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "blog_votes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "blog_votes_blog_user_key" UNIQUE ("blog_id", "user_id"),
  CONSTRAINT "blog_votes_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "blogs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "blog_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "blog_votes_blog_vote_type_idx" ON "blog_votes"("blog_id", "vote_type");
CREATE INDEX IF NOT EXISTS "blog_votes_user_created_idx" ON "blog_votes"("user_id", "created_at");
