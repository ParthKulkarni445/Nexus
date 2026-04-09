import { db } from "@/lib/db";

export type ThreadMappingSource =
  | "domain_match"
  | "mail_request"
  | "manual_override";

export function buildMailboxClassification(
  companyId: string | null,
  source: string,
  confidence?: string | null,
  conflictingCompanyId?: string | null,
) {
  return {
    bucket: companyId ? "company" : "unassigned",
    mappingSource: source,
    confidence: confidence ?? null,
    conflictingCompanyId: conflictingCompanyId ?? null,
  };
}

export async function getThreadCompanyMapping(threadId: string) {
  const normalizedThreadId = threadId.trim();
  if (!normalizedThreadId) return null;

  const prisma = db as any;
  return prisma.emailThreadMapping.findUnique({
    where: { threadId: normalizedThreadId },
    select: {
      id: true,
      threadId: true,
      companyId: true,
      source: true,
      confidence: true,
      updatedAt: true,
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function upsertThreadCompanyMapping(input: {
  threadId: string;
  companyId: string;
  source: ThreadMappingSource;
  confidence?: string | null;
}) {
  const normalizedThreadId = input.threadId.trim();
  if (!normalizedThreadId) return null;

  const prisma = db as any;
  return prisma.emailThreadMapping.upsert({
    where: { threadId: normalizedThreadId },
    update: {
      companyId: input.companyId,
      source: input.source,
      confidence: input.confidence ?? null,
      lastResolvedAt: new Date(),
      updatedAt: new Date(),
    },
    create: {
      threadId: normalizedThreadId,
      companyId: input.companyId,
      source: input.source,
      confidence: input.confidence ?? null,
      lastResolvedAt: new Date(),
    },
  });
}

export async function applyThreadCompanyMapping(input: {
  threadId: string;
  companyId: string;
  source: ThreadMappingSource;
  confidence?: string | null;
  conflictingCompanyId?: string | null;
}) {
  const normalizedThreadId = input.threadId.trim();
  if (!normalizedThreadId) {
    return { threadMapping: null, updatedCount: 0 };
  }

  const prisma = db as any;
  const threadMapping = await upsertThreadCompanyMapping({
    threadId: normalizedThreadId,
    companyId: input.companyId,
    source: input.source,
    confidence: input.confidence,
  });

  const result = await prisma.email.updateMany({
    where: {
      threadId: normalizedThreadId,
    },
    data: {
      companyId: input.companyId,
      classification: buildMailboxClassification(
        input.companyId,
        input.source,
        input.confidence,
        input.conflictingCompanyId,
      ),
    },
  });

  return {
    threadMapping,
    updatedCount: result.count as number,
  };
}
