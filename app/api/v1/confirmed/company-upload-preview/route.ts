import { getCurrentUser, hasRole } from "@/lib/api/auth";
import { parseWorkbookSheetsBuffer } from "@/lib/api/excel";
import { badRequest, forbidden, serverError, success, unauthorized } from "@/lib/api/response";
import { extractEntryNumberFromValue, findHeaderByName } from "@/lib/api/student-entries";
import { db } from "@/lib/db";

const ENTRY_HEADERS = ["Roll Number", "Entry Number"];
const COMPANY_HEADERS = ["Placed in Company", "Placed In Company", "Company"];
const ROLE_HEADERS = ["Job Profile Title", "Role", "Job Title", "Profile"];
const STATUS_HEADERS = ["Placement Status"];

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

type UploadCompanyAggregate = {
  uploadedCompanyName: string;
  normalizedKey: string;
  rowCount: number;
  entryNumbers: Set<string>;
  roles: Set<string>;
  sheets: Set<string>;
};

type CandidateCompany = {
  companyId: string;
  companyName: string;
  normalizedName: string;
  strippedName: string;
  nameTokens: Set<string>;
  roleTokens: Set<string>;
  placementCount: number;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeCompanyName(value: string) {
  return normalizeWhitespace(
    value
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " "),
  );
}

function getNameTokens(value: string) {
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

function stripCompanyDecorators(value: string) {
  return getNameTokens(value).join(" ");
}

function getRoleTokens(values: Iterable<string>) {
  const tokenSet = new Set<string>();

  for (const value of values) {
    const tokens = normalizeCompanyName(value)
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length >= 3 && !/^\d+$/.test(token));

    for (const token of tokens) {
      tokenSet.add(token);
    }
  }

  return tokenSet;
}

function getSetOverlap(left: Set<string>, right: Set<string>) {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.max(left.size, right.size);
}

function inferReason(score: number, exactName: boolean, strippedExact: boolean, roleOverlap: number) {
  if (exactName) {
    return "Exact company name match";
  }

  if (strippedExact) {
    return "Matched after removing Pvt/Ltd style suffixes";
  }

  if (roleOverlap >= 0.5) {
    return "Strong company similarity with supporting role overlap from placement history";
  }

  if (score >= 0.7) {
    return "High company-name similarity";
  }

  return "Closest available company candidate";
}

function scoreCandidate(uploadedCompanyName: string, uploadedRoles: Set<string>, candidate: CandidateCompany) {
  const normalizedUpload = normalizeCompanyName(uploadedCompanyName);
  const strippedUpload = stripCompanyDecorators(uploadedCompanyName);
  const uploadTokens = new Set(getNameTokens(uploadedCompanyName));
  const uploadRoleTokens = getRoleTokens(uploadedRoles);

  const exactName = normalizedUpload.length > 0 && normalizedUpload === candidate.normalizedName;
  const strippedExact =
    strippedUpload.length > 0 &&
    strippedUpload === candidate.strippedName;

  if (exactName) {
    return {
      score: 1,
      reason: inferReason(1, true, false, 0),
    };
  }

  if (strippedExact) {
    return {
      score: 0.96,
      reason: inferReason(0.96, false, true, 0),
    };
  }

  let score = 0;

  if (
    normalizedUpload.length > 0 &&
    candidate.normalizedName.length > 0 &&
    (candidate.normalizedName.includes(normalizedUpload) ||
      normalizedUpload.includes(candidate.normalizedName))
  ) {
    score = Math.max(score, 0.84);
  }

  if (
    strippedUpload.length > 0 &&
    candidate.strippedName.length > 0 &&
    (candidate.strippedName.includes(strippedUpload) ||
      strippedUpload.includes(candidate.strippedName))
  ) {
    score = Math.max(score, 0.88);
  }

  const nameOverlap = getSetOverlap(uploadTokens, candidate.nameTokens);
  score = Math.max(score, nameOverlap * 0.82);

  const roleOverlap = getSetOverlap(uploadRoleTokens, candidate.roleTokens);
  score += Math.min(0.12, roleOverlap * 0.12);

  if (candidate.placementCount > 0 && score > 0.5) {
    score += 0.03;
  }

  return {
    score: Math.min(1, Number(score.toFixed(4))),
    reason: inferReason(score, false, false, roleOverlap),
  };
}

function isRelevantStatus(value: string | undefined) {
  const normalized = normalizeCompanyName(value ?? "");

  if (!normalized) {
    return true;
  }

  if (normalized === "placed" || normalized === "accepted" || normalized === "offered") {
    return true;
  }

  return !(normalized.includes("unplaced") || normalized === "no");
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions to upload confirmed company data");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return badRequest("Invalid multipart request body");
  }

  const seasonId = String(formData.get("seasonId") ?? "").trim();
  if (!seasonId) {
    return badRequest("seasonId is required");
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
    const acceptedCycles = await db.companySeasonCycle.findMany({
      where: {
        seasonId,
        status: "accepted",
      },
      select: {
        id: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        drives: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 500,
    });

    if (acceptedCycles.length === 0) {
      return badRequest("No accepted companies found for the selected season");
    }

    const placements = await db.placement.findMany({
      where: {
        companyId: {
          in: acceptedCycles.map((cycle) => cycle.companyId),
        },
      },
      select: {
        companyId: true,
        role: true,
      },
      take: 5000,
    });

    const placementRoleMap = new Map<string, string[]>();
    for (const placement of placements) {
      const current = placementRoleMap.get(placement.companyId) ?? [];
      current.push(placement.role);
      placementRoleMap.set(placement.companyId, current);
    }

    const candidates: CandidateCompany[] = acceptedCycles.map((cycle) => {
      const historicalRoles = placementRoleMap.get(cycle.companyId) ?? [];
      const driveTitles = cycle.drives.map((drive) => drive.title);
      return {
        companyId: cycle.companyId,
        companyName: cycle.company.name,
        normalizedName: normalizeCompanyName(cycle.company.name),
        strippedName: stripCompanyDecorators(cycle.company.name),
        nameTokens: new Set(getNameTokens(cycle.company.name)),
        roleTokens: getRoleTokens([...driveTitles, ...historicalRoles]),
        placementCount: historicalRoles.length,
      };
    });

    const sheetPayload = parseWorkbookSheetsBuffer(buffer);
    const companyAggregateMap = new Map<string, UploadCompanyAggregate>();
    const matchedSheetNames: string[] = [];
    let parsedStudentRows = 0;
    let skippedStudentRows = 0;

    for (const sheet of sheetPayload) {
      const entryHeader = findHeaderByName(sheet.headers, ENTRY_HEADERS);
      const companyHeader = findHeaderByName(sheet.headers, COMPANY_HEADERS);

      if (!entryHeader || !companyHeader) {
        continue;
      }

      matchedSheetNames.push(sheet.sheetName);

      const roleHeader = findHeaderByName(sheet.headers, ROLE_HEADERS);
      const statusHeader = findHeaderByName(sheet.headers, STATUS_HEADERS);

      for (const record of sheet.records) {
        const companyName = normalizeWhitespace(record[companyHeader] ?? "");
        if (!companyName) {
          continue;
        }

        if (!isRelevantStatus(statusHeader ? record[statusHeader] : "")) {
          skippedStudentRows += 1;
          continue;
        }

        const normalizedCompany = normalizeCompanyName(companyName);
        if (
          !normalizedCompany ||
          normalizedCompany === "unplaced" ||
          normalizedCompany === "no" ||
          normalizedCompany === "na" ||
          normalizedCompany === "n a" ||
          normalizedCompany === "not placed" ||
          normalizedCompany === "off campus placed"
        ) {
          skippedStudentRows += 1;
          continue;
        }

        const entryNumber = extractEntryNumberFromValue(record[entryHeader]);
        if (!entryNumber) {
          skippedStudentRows += 1;
          continue;
        }

        parsedStudentRows += 1;

        const aggregate =
          companyAggregateMap.get(normalizedCompany) ??
          {
            uploadedCompanyName: companyName,
            normalizedKey: normalizedCompany,
            rowCount: 0,
            entryNumbers: new Set<string>(),
            roles: new Set<string>(),
            sheets: new Set<string>(),
          };

        aggregate.rowCount += 1;
        aggregate.entryNumbers.add(entryNumber);
        aggregate.sheets.add(sheet.sheetName);

        const role = normalizeWhitespace(roleHeader ? record[roleHeader] ?? "" : "");
        if (role) {
          aggregate.roles.add(role);
        }

        companyAggregateMap.set(normalizedCompany, aggregate);
      }
    }

    if (matchedSheetNames.length === 0) {
      return badRequest("No supported student-wise sheets were found in the uploaded file", {
        supportedColumns: {
          company: COMPANY_HEADERS,
          entryNumber: ENTRY_HEADERS,
          role: ROLE_HEADERS,
        },
      });
    }

    const uploadedCompanies = Array.from(companyAggregateMap.values())
      .map((aggregate) => {
        const suggestions = candidates
          .map((candidate) => {
            const result = scoreCandidate(
              aggregate.uploadedCompanyName,
              aggregate.roles,
              candidate,
            );

            return {
              companyId: candidate.companyId,
              companyName: candidate.companyName,
              score: result.score,
              reason: result.reason,
            };
          })
          .sort((left, right) => right.score - left.score)
          .slice(0, 5);

        const bestSuggestion = suggestions[0] ?? null;
        const autoMatched =
          bestSuggestion !== null &&
          (bestSuggestion.score >= 0.78 || bestSuggestion.score === 1);

        return {
          uploadedCompanyName: aggregate.uploadedCompanyName,
          rowCount: aggregate.rowCount,
          uniqueEntryCount: aggregate.entryNumbers.size,
          sheets: Array.from(aggregate.sheets).sort((left, right) =>
            left.localeCompare(right),
          ),
          roles: Array.from(aggregate.roles).sort((left, right) =>
            left.localeCompare(right),
          ),
          matchedCompany: autoMatched ? bestSuggestion : null,
          suggestions,
        };
      })
      .sort((left, right) =>
        left.uploadedCompanyName.localeCompare(right.uploadedCompanyName),
      );

    return success({
      fileName: file.name,
      matchedSheetNames,
      parsedStudentRows,
      skippedStudentRows,
      uploadedCompanyCount: uploadedCompanies.length,
      autoMatchedCount: uploadedCompanies.filter((company) => company.matchedCompany).length,
      unmatchedCompanies: uploadedCompanies.filter((company) => !company.matchedCompany),
      matchedCompanies: uploadedCompanies.filter((company) => company.matchedCompany),
    });
  } catch (error) {
    console.error("Error building confirmed company upload preview:", error);
    return serverError("Unable to process confirmed company upload");
  }
}
