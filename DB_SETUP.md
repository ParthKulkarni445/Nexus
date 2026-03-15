# Database Setup Guide

This project uses **Prisma ORM** with **PostgreSQL**.

## Prerequisites

1. A PostgreSQL database
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

   Example for a local Prisma Postgres-compatible database:

   ```
   DATABASE_URL=postgresql://postgres:password@localhost:5432/nexus
   ```

If your `DATABASE_URL` uses a proxy/accelerate URL (for example `prisma+postgres://...`), set a direct runtime URL as well:

```
DATABASE_URL_RUNTIME=postgresql://user:password@host:port/database
```

You can also use `DIRECT_URL` as a direct runtime fallback.

Optional overrides if you want separate connections:

```
DATABASE_URL_RUNTIME=postgresql://user:password@host:port/database
DATABASE_URL_MIGRATIONS=postgresql://user:password@host:port/database
```

## Database Commands

### Generate Prisma Client

Generate the Prisma client after schema changes:

```bash
npm run db:generate
```

### Apply Migrations

Create/apply pending Prisma migrations to your database:

```bash
npm run db:migrate
```

### Push Schema (Development)

Push schema changes directly to the database (skips migration files):

```bash
npm run db:push
```

### Prisma Studio

Open Prisma Studio to browse and edit your database:

```bash
npm run db:studio
```

## Schema Organization

The database schema is defined in:

- **`prisma/schema.prisma`** - Prisma models, enums, mappings, and relations
- **`prisma/migrations/`** - SQL migrations managed by Prisma

## Usage in Code

Import the Prisma client:

```typescript
import { db } from "@/lib/db";

// Query example
const allUsers = await db.user.findMany();

// Insert example
await db.company.create({
  data: {
    name: "Example Corp",
    slug: "example-corp",
  },
});
```

## Initial Setup Steps

1. Set up your environment variables
2. Generate Prisma client: `npm run db:generate`
3. Apply migrations: `npm run db:migrate`
4. Start developing!

## Notes

- The schema follows the design specified in `DB_SCHEMA.md`
- All tables use UUID primary keys
- Timestamps use `timestamptz` for timezone awareness
- Soft deletes are implemented where needed via `deleted_at` columns
- Audit logs should be created for all critical write operations
