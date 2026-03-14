import { PrismaClient } from "@prisma/client";

const runtimeDatabaseUrl =
  process.env.DATABASE_URL_RUNTIME ?? process.env.DATABASE_URL;

if (!runtimeDatabaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Optionally, use DATABASE_URL_RUNTIME to override the runtime connection."
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
