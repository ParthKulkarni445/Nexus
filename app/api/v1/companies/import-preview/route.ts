import { getCurrentUser, hasRole } from "@/lib/api/auth";
import {
  badRequest,
  forbidden,
  serverError,
  success,
  unauthorized,
} from "@/lib/api/response";
import {
  IMPORT_REQUIRED_HEADERS,
  normalizeCompanyName,
  parseCompanyImportBuffer,
  scoreCompanyNameMatch,
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
    buffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return badRequest("Unable to read uploaded file");
  }

  try {
    const parsed = parseCompanyImportBuffer(buffer);

    if (parsed.headers.length === 0) {
      return badRequest("Excel file is empty");
    }

    if (parsed.missingHeaders.length > 0) {
      return badRequest("Excel headers are invalid", {
        missingHeaders: parsed.missingHeaders,
        requiredHeaders: [...IMPORT_REQUIRED_HEADERS],
      });
    }

    if (parsed.rowsToUpsert.length === 0) {
      if (parsed.validationErrors.length > 0) {
        return badRequest("Import validation failed", {
          errors: parsed.validationErrors,
        });
      }
      return badRequest("Excel file does not contain any data rows");
    }

    if (parsed.validationErrors.length > 0) {
      return badRequest("Import validation failed", {
        errors: parsed.validationErrors,
      });
    }

    const existingCompanies = await db.company.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        industry: true,
      },
      take: 5000,
      orderBy: [{ name: "asc" }],
    });

    const previewRows = parsed.rowsToUpsert.map((row) => {
      const rowSlug = slugify(row.companyName);
      const exactMatch =
        existingCompanies.find((company) => company.slug === rowSlug) ?? null;

      const suggestions = existingCompanies
        .map((company) => {
          const result = scoreCompanyNameMatch(row.companyName, company.name);
          return {
            companyId: company.id,
            companyName: company.name,
            slug: company.slug,
            score: result.score,
            reason: result.reason,
          };
        })
        .sort((left, right) => right.score - left.score)
        .slice(0, 5);

      const bestSuggestion = suggestions[0] ?? null;

      const duplicateCandidate = exactMatch
        ? {
            companyId: exactMatch.id,
            companyName: exactMatch.name,
            slug: exactMatch.slug,
            score: 1,
            reason: "Exact slug match",
          }
        : bestSuggestion && bestSuggestion.score >= 0.78
          ? bestSuggestion
          : null;

      return {
        rowKey: row.rowKey,
        rowNumber: row.rowNumber,
        companyName: row.companyName,
        industry: row.industry,
        priority: row.priority,
        domains: row.domains,
        contacts: row.contacts,
        duplicateCandidate: duplicateCandidate
          ? {
              companyId: duplicateCandidate.companyId,
              companyName: duplicateCandidate.companyName,
              slug: duplicateCandidate.slug,
              score: duplicateCandidate.score,
              reason: duplicateCandidate.reason,
            }
          : null,
        suggestions,
        normalizedName: normalizeCompanyName(row.companyName),
      };
    });

    return success({
      fileName: file.name,
      totalRows: previewRows.length,
      duplicateRows: previewRows.filter((row) => row.duplicateCandidate).length,
      newRows: previewRows.filter((row) => !row.duplicateCandidate).length,
      rows: previewRows,
    });
  } catch (error) {
    console.error("Error previewing company import:", error);
    return serverError("Unable to preview company import");
  }
}
