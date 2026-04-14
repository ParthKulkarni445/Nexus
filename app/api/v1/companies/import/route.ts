import { Prisma } from "@prisma/client";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import {
  badRequest,
  forbidden,
  serverError,
  success,
  unauthorized,
} from "@/lib/api/response";
import { createAuditLog } from "@/lib/api/audit";
import {
  parseCompanyImportBuffer,
  priorityToNumber,
  slugify,
} from "@/lib/api/company-import";
import { db } from "@/lib/db";

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

  const resolvedMatchesText = String(formData.get("resolvedMatches") ?? "{}").trim();
  let resolvedMatches: Record<string, string> = {};
  try {
    resolvedMatches = JSON.parse(resolvedMatchesText) as Record<string, string>;
  } catch {
    return badRequest("resolvedMatches must be valid JSON");
  }

  const parsed = parseCompanyImportBuffer(buffer);

  if (parsed.headers.length === 0) {
    return badRequest("Excel file is empty");
  }

  if (parsed.missingHeaders.length > 0) {
    return badRequest("Excel headers are invalid", {
      missingHeaders: parsed.missingHeaders,
      requiredHeaders: ["company name", "industry", "priority", "domain"],
    });
  }

  if (parsed.rowsToUpsert.length === 0) {
    return badRequest("Excel file does not contain any data rows");
  }

  if (parsed.validationErrors.length > 0) {
    return badRequest("Import validation failed", {
      errors: parsed.validationErrors,
    });
  }

  const rowsToUpsert = parsed.rowsToUpsert;

  try {
    const result = await db.$transaction(async (tx) => {
      let created = 0;
      let updated = 0;

      for (const row of rowsToUpsert) {
        const slug = slugify(row.companyName);
        const primaryDomain = row.domains[0] ?? null;
        const reviewedMatchId = resolvedMatches[row.companyName];
        const existing = reviewedMatchId
          ? await tx.company.findUnique({
              where: { id: reviewedMatchId },
              select: { id: true },
            })
          : await tx.company.findUnique({
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
