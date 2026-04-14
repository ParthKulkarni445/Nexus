import { z } from "zod";
import { parseWorkbookBuffer } from "@/lib/api/excel";

export const IMPORT_HEADERS = [
  "company name",
  "industry",
  "priority",
  "domain",
] as const;

export const importRowSchema = z.object({
  companyName: z.string().min(1).max(255),
  industry: z.string().min(1).max(100),
  priority: z.enum(["low", "medium", "high"]),
  domains: z.array(z.string().min(1).max(255)),
});

const COMPANY_STOP_WORDS = new Set([
  "and",
  "company",
  "co",
  "corp",
  "corporation",
  "inc",
  "incorporated",
  "llc",
  "llp",
  "ltd",
  "limited",
  "pvt",
  "private",
  "plc",
  "the",
]);

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 255);
}

export function parsePriority(rawValue: string | undefined) {
  const normalized = (rawValue ?? "").trim().toLowerCase();
  if (normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }
  return "";
}

function toDomainToken(value: string) {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/^[<\[(\"'`]+/, "")
    .replace(/[>\])\"'`.,;:!?]+$/, "");

  if (!cleaned) return null;

  if (cleaned.includes("@")) {
    const atIndex = cleaned.lastIndexOf("@");
    const afterAt = cleaned.slice(atIndex + 1);
    return afterAt || null;
  }

  try {
    const host = new URL(
      /^https?:\/\//.test(cleaned) ? cleaned : `https://${cleaned}`,
    ).hostname;
    return host || null;
  } catch {
    return cleaned;
  }
}

function isValidDomain(domain: string) {
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(
    domain,
  );
}

export function parseDomainValues(rawValue: string | undefined) {
  if (!rawValue || !rawValue.trim()) {
    return { domains: [] as string[], invalidTokens: [] as string[] };
  }

  const parts = rawValue
    .split(/[\n,;|\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const uniqueDomains = new Set<string>();
  const invalidTokens: string[] = [];

  for (const part of parts) {
    const token = toDomainToken(part);
    if (!token) continue;
    const normalized = token.replace(/^www\./, "");
    if (!isValidDomain(normalized)) {
      invalidTokens.push(part);
      continue;
    }
    uniqueDomains.add(normalized);
  }

  return { domains: Array.from(uniqueDomains), invalidTokens };
}

export function normalizeCompanyName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getNameTokens(value: string) {
  return normalizeCompanyName(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(
      (token) =>
        token.length >= 2 &&
        !COMPANY_STOP_WORDS.has(token) &&
        !/^\d+$/.test(token),
    );
}

export function stripCompanyDecorators(value: string) {
  return getNameTokens(value).join(" ");
}

function getSetOverlap(left: Set<string>, right: Set<string>) {
  if (left.size === 0 || right.size === 0) return 0;
  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) overlap += 1;
  }
  return overlap / Math.max(left.size, right.size);
}

export function scoreCompanyNameMatch(uploadedName: string, existingName: string) {
  const normalizedUpload = normalizeCompanyName(uploadedName);
  const normalizedExisting = normalizeCompanyName(existingName);
  const strippedUpload = stripCompanyDecorators(uploadedName);
  const strippedExisting = stripCompanyDecorators(existingName);
  const uploadTokens = new Set(getNameTokens(uploadedName));
  const existingTokens = new Set(getNameTokens(existingName));

  if (normalizedUpload && normalizedUpload === normalizedExisting) {
    return { score: 1, reason: "Exact company name match" };
  }

  if (strippedUpload && strippedUpload === strippedExisting) {
    return { score: 0.96, reason: "Matched after removing Pvt/Ltd style suffixes" };
  }

  let score = 0;

  if (
    normalizedUpload &&
    normalizedExisting &&
    (normalizedExisting.includes(normalizedUpload) ||
      normalizedUpload.includes(normalizedExisting))
  ) {
    score = Math.max(score, 0.84);
  }

  if (
    strippedUpload &&
    strippedExisting &&
    (strippedExisting.includes(strippedUpload) ||
      strippedUpload.includes(strippedExisting))
  ) {
    score = Math.max(score, 0.88);
  }

  score = Math.max(score, getSetOverlap(uploadTokens, existingTokens) * 0.82);

  if (score >= 0.7) {
    return { score: Number(score.toFixed(4)), reason: "High company-name similarity" };
  }

  return { score: Number(score.toFixed(4)), reason: "Closest existing company candidate" };
}

export function priorityToNumber(priority: "low" | "medium" | "high") {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

export function parseCompanyImportBuffer(buffer: Buffer) {
  const { headers, records } = parseWorkbookBuffer(buffer);

  if (headers.length === 0) {
    return {
      headers,
      rowsToUpsert: [] as Array<z.infer<typeof importRowSchema>>,
      validationErrors: [] as Array<{ row: number; message: string }>,
      missingHeaders: [] as string[],
    };
  }

  const missingHeaders = IMPORT_HEADERS.filter((header) => !headers.includes(header));
  const validationErrors: Array<{ row: number; message: string }> = [];

  const normalizedRows = records.map((record, index) => {
    const rowNumber = index + 2;
    const companyName = (record["company name"] ?? "").trim();
    const priority = parsePriority(record.priority);
    const { domains, invalidTokens } = parseDomainValues(record.domain);

    if (!priority) {
      validationErrors.push({
        row: rowNumber,
        message: "priority must be one of: low, medium, high",
      });
      return null;
    }

    if (invalidTokens.length > 0) {
      validationErrors.push({
        row: rowNumber,
        message: `invalid domain values: ${invalidTokens.join(", ")}`,
      });
      return null;
    }

    const parsed = importRowSchema.safeParse({
      companyName,
      industry: (record.industry ?? "").trim(),
      priority,
      domains,
    });

    if (!parsed.success) {
      validationErrors.push({
        row: rowNumber,
        message: parsed.error.issues.map((issue) => issue.message).join(", "),
      });
      return null;
    }

    return parsed.data;
  });

  return {
    headers,
    rowsToUpsert: normalizedRows.filter(
      (row): row is z.infer<typeof importRowSchema> => row !== null,
    ),
    validationErrors,
    missingHeaders,
  };
}
