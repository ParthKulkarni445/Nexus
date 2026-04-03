import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import {
  badRequest,
  forbidden,
  serverError,
  success,
  unauthorized,
} from "@/lib/api/response";
import { createAuditLog } from "@/lib/api/audit";
import { parseWorkbookBuffer } from "@/lib/api/excel";
import { db } from "@/lib/db";

const IMPORT_HEADERS = [
  "company name",
  "industry",
  "priority",
  "domain",
] as const;

const importRowSchema = z.object({
  companyName: z.string().min(1).max(255),
  industry: z.string().min(1).max(100),
  priority: z.enum(["low", "medium", "high"]),
  domains: z.array(z.string().min(1).max(255)),
});

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 255);
}

function parsePriority(rawValue: string | undefined) {
  const normalized = (rawValue ?? "").trim().toLowerCase();

  if (!normalized) {
    return "";
  }

  if (normalized === "high") {
    return "high";
  }

  if (normalized === "medium") {
    return "medium";
  }

  if (normalized === "low") {
    return "low";
  }

  return "";
}

function toDomainToken(value: string) {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/^[<\[(\"'`]+/, "")
    .replace(/[>\])\"'`.,;:!?]+$/, "");

  if (!cleaned) {
    return null;
  }

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
  // A practical domain check: label.label with alnum/hyphen labels.
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(
    domain,
  );
}

function parseDomainValues(rawValue: string | undefined) {
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
    if (!token) {
      continue;
    }

    const normalized = token.replace(/^www\./, "");
    if (!isValidDomain(normalized)) {
      invalidTokens.push(part);
      continue;
    }

    uniqueDomains.add(normalized);
  }

  return { domains: Array.from(uniqueDomains), invalidTokens };
}

function priorityToNumber(priority: "low" | "medium" | "high") {
  if (priority === "high") {
    return 3;
  }
  if (priority === "medium") {
    return 2;
  }
  return 1;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions to import companies");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return badRequest("Invalid multipart request body");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return badRequest("Excel file is required in 'file' field");
  }

  let buffer: Buffer;
  try {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } catch {
    return badRequest("Unable to read uploaded file");
  }

  const { headers, records } = parseWorkbookBuffer(buffer);

  if (headers.length === 0) {
    return badRequest("Excel file is empty");
  }

  const missingHeaders = IMPORT_HEADERS.filter(
    (header) => !headers.includes(header),
  );

  if (missingHeaders.length > 0) {
    return badRequest("Excel headers are invalid", {
      missingHeaders,
      requiredHeaders: IMPORT_HEADERS,
    });
  }

  if (records.length === 0) {
    return badRequest("Excel file does not contain any data rows");
  }

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

  if (validationErrors.length > 0) {
    return badRequest("Import validation failed", {
      errors: validationErrors,
    });
  }

  const rowsToUpsert = normalizedRows.filter(
    (row): row is z.infer<typeof importRowSchema> => row !== null,
  );

  try {
    const result = await db.$transaction(async (tx) => {
      let created = 0;
      let updated = 0;

      for (const row of rowsToUpsert) {
        const slug = slugify(row.companyName);
        const primaryDomain = row.domains[0] ?? null;
        const existing = await tx.company.findUnique({
          where: { slug },
          select: { id: true },
        });

        if (existing) {
          await tx.company.update({
            where: { id: existing.id },
            data: {
              name: row.companyName,
              domain: primaryDomain,
              industry: row.industry,
              priority: priorityToNumber(row.priority),
              updatedBy: user.id,
              updatedField: "import",
              updatedAt: new Date(),
            },
          });

          await tx.companyDomain.deleteMany({
            where: { companyId: existing.id },
          });

          if (row.domains.length > 0) {
            await tx.companyDomain.createMany({
              data: row.domains.map((domain) => ({
                companyId: existing.id,
                domain,
                confidence: "imported",
                createdBy: user.id,
              })),
              skipDuplicates: true,
            });
          }

          updated += 1;
          continue;
        }

        const createdCompany = await tx.company.create({
          data: {
            name: row.companyName,
            slug,
            domain: primaryDomain,
            industry: row.industry,
            priority: priorityToNumber(row.priority),
            createdBy: user.id,
            updatedBy: user.id,
            updatedField: "import",
          },
          select: { id: true },
        });

        if (row.domains.length > 0) {
          await tx.companyDomain.createMany({
            data: row.domains.map((domain) => ({
              companyId: createdCompany.id,
              domain,
              confidence: "imported",
              createdBy: user.id,
            })),
            skipDuplicates: true,
          });
        }

        created += 1;
      }

      return {
        total: rowsToUpsert.length,
        created,
        updated,
      };
    });

    await createAuditLog({
      actorId: user.id,
      action: "import_companies",
      targetType: "company",
      meta: {
        fileName: file.name,
        ...result,
      },
    });

    return success(result);
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return badRequest("Duplicate slug detected in Excel data");
    }

    console.error("Error importing companies:", error);
    return serverError();
  }
}
