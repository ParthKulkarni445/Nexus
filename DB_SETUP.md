# Database Setup Guide

This project uses **Drizzle ORM** with **PostgreSQL** (Supabase).

## Prerequisites

1. A PostgreSQL database (Supabase recommended)
2. Database connection URL

## Environment Setup

1. Copy `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

2. Update `DATABASE_URL` in `.env.local` with your database credentials:

   ```
   DATABASE_URL=postgresql://user:password@host:port/database
   ```

   For Supabase:

   ```
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```

## Database Commands

### Generate Migrations

Generate SQL migration files from your schema:

```bash
npm run db:generate
```

### Apply Migrations

Apply pending migrations to your database:

```bash
npm run db:migrate
```

### Push Schema (Development)

Push schema changes directly to the database (skips migration files):

```bash
npm run db:push
```

### Drizzle Studio

Open Drizzle Studio to browse and edit your database:

```bash
npm run db:studio
```

## Schema Organization

The database schema is organized into logical modules:

- **`lib/db/enums.ts`** - PostgreSQL enums
- **`lib/db/schema/users.ts`** - User and permission tables
- **`lib/db/schema/companies.ts`** - Company-related tables
- **`lib/db/schema/recruitment.ts`** - Recruitment seasons, drives, interactions
- **`lib/db/schema/emails.ts`** - Email templates and mail system
- **`lib/db/schema/audit.ts`** - Audit logs, blogs, notifications

## Usage in Code

Import the database client and schema:

```typescript
import { db } from "@/lib/db";
import { users, companies } from "@/lib/db/schema";

// Query example
const allUsers = await db.select().from(users);

// Insert example
await db.insert(companies).values({
  name: "Example Corp",
  slug: "example-corp",
});
```

## Initial Setup Steps

1. Set up your environment variables
2. Generate migrations: `npm run db:generate`
3. Apply migrations: `npm run db:migrate`
4. Start developing!

## Notes

- The schema follows the design specified in `DB_SCHEMA.md`
- All tables use UUID primary keys
- Timestamps use `timestamptz` for timezone awareness
- Soft deletes are implemented where needed via `deleted_at` columns
- Audit logs should be created for all critical write operations
