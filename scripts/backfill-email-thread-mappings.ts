import { db } from "@/lib/db";
import { applyThreadCompanyMapping } from "@/lib/mailing/threadMapping";

async function main() {
  const prisma = db as any;

  const candidateEmails: Array<{
    threadId: string;
    companyId: string;
    direction: "inbound" | "outbound";
  }> = await prisma.email.findMany({
    where: {
      threadId: {
        not: null,
      },
      companyId: {
        not: null,
      },
    },
    select: {
      threadId: true,
      companyId: true,
      direction: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const threadSeeds = new Map<
    string,
    { companyId: string; direction: "inbound" | "outbound" }
  >();

  for (const email of candidateEmails) {
    if (!email.threadId || !email.companyId || threadSeeds.has(email.threadId)) {
      continue;
    }
    threadSeeds.set(email.threadId, {
      companyId: email.companyId,
      direction: email.direction,
    });
  }

  let updatedThreads = 0;
  let updatedEmails = 0;

  for (const [threadId, seed] of threadSeeds) {
    const result = await applyThreadCompanyMapping({
      threadId,
      companyId: seed.companyId,
      source: "domain_match",
      confidence: seed.direction === "inbound" ? "high" : "medium",
    });

    updatedThreads += result.threadMapping ? 1 : 0;
    updatedEmails += result.updatedCount;
  }

  console.log(
    JSON.stringify(
      {
        scannedMappedMessages: candidateEmails.length,
        mappedThreads: updatedThreads,
        updatedEmails,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("Failed to backfill email thread mappings:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
