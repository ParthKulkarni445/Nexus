import { PrismaClient } from "@prisma/client";

const runtimeDatabaseUrl =
  process.env.DATABASE_URL_RUNTIME ??
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL_MIGRATIONS ??
  process.env.DATABASE_URL;

if (!runtimeDatabaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Optionally, use DATABASE_URL_RUNTIME to override the runtime connection."
  );
}

if (
  process.env.NODE_ENV !== "production" &&
  runtimeDatabaseUrl.startsWith("prisma+postgres://") &&
  !process.env.DATABASE_URL_RUNTIME &&
  !process.env.DIRECT_URL
) {
  console.warn(
    "[db] Runtime is using a Prisma Data Proxy URL. If you see intermittent P5010/fetch failed errors locally, set DATABASE_URL_RUNTIME (or DIRECT_URL) to a direct postgresql:// connection string."
  );
}

type GlobalDb = {
  prisma?: PrismaClient;
};

const globalDb = globalThis as typeof globalThis & { __nexusDb?: GlobalDb };

function createClient(): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: {
        url: runtimeDatabaseUrl,
      },
    },
  });
}

const prisma = globalDb.__nexusDb?.prisma ?? createClient();

if (!globalDb.__nexusDb) {
  globalDb.__nexusDb = {
    prisma,
  };
}

export const db = globalDb.__nexusDb.prisma!;
