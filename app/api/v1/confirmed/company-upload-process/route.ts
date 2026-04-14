import { RecruitmentSeason } from "@prisma/client";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import { parseUploadedWorkbook, normalizeCompanyName, normalizeWhitespace } from "@/lib/api/confirmed-company-upload";
import { badRequest, forbidden, serverError, success, unauthorized } from "@/lib/api/response";
import { db } from "@/lib/db";

function normalizeRole(value: string) {
  return normalizeWhitespace(value).toLowerCase();
}

function getRoleTokens(value: string) {
  return normalizeCompanyName(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !/^\d+$/.test(token));
}

function scoreDriveTitle(role: string, driveTitle: string) {
  const normalizedRole = normalizeRole(role);
  const normalizedDrive = normalizeRole(driveTitle);

  if (!normalizedRole) {
    return 0;
  }

  if (normalizedRole === normalizedDrive) {
    return 1;
  }

  if (
    normalizedRole.length > 0 &&
    normalizedDrive.length > 0 &&
    (normalizedRole.includes(normalizedDrive) ||
      normalizedDrive.includes(normalizedRole))
  ) {
    return 0.9;
  }

  const roleTokens = new Set(getRoleTokens(role));
  const driveTokens = new Set(getRoleTokens(driveTitle));
  if (roleTokens.size === 0 || driveTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of roleTokens) {
    if (driveTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.max(roleTokens.size, driveTokens.size);
}

function findBestDriveId(
  role: string,
  drives: Array<{ id: string; title: string }>,
) {
  if (drives.length === 0) {
    return null;
  }

  if (drives.length === 1) {
    return drives[0].id;
  }

  let bestDrive: { id: string; score: number } | null = null;
  for (const drive of drives) {
    const score = scoreDriveTitle(role, drive.title);
    if (!bestDrive || score > bestDrive.score) {
      bestDrive = { id: drive.id, score };
    }
  }

  if (!bestDrive || bestDrive.score < 0.45) {
    return null;
  }

  return bestDrive.id;
}

function parseCompensationAmount(
  rawValue: string,
  seasonType: RecruitmentSeason["seasonType"],
) {
  const cleaned = rawValue.replace(/[^0-9.,]/g, "").trim();
  if (!cleaned) {
    return { packageAmount: seasonType === "placement" ? 0 : 0, hasValue: false };
  }

  let numericText = cleaned;
  if (cleaned.includes(".") && cleaned.includes(",")) {
    numericText = cleaned.replace(/,/g, "");
  } else {
    numericText = cleaned.replace(/,/g, "");
  }

  const numericValue = Number(numericText);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return { packageAmount: seasonType === "placement" ? 0 : 0, hasValue: false };
  }

  if (seasonType === "placement") {
    const amount = numericValue >= 1000 ? numericValue / 100000 : numericValue;
    return { packageAmount: Number(amount.toFixed(2)), hasValue: true };
  }

  return { packageAmount: Number(numericValue.toFixed(2)), hasValue: true };
}

function getPlacementIdentityKey(input: {
  studentId?: string | null;
  studentEntryNumber?: string | null;
  companyId: string;
  role: string;
}) {
  const identity =
    input.studentId?.trim() ||
    input.studentEntryNumber?.trim().toUpperCase() ||
    "unknown";

  return `${identity}:${input.companyId}:${normalizeRole(input.role)}`;
}

function isPrismaKnownError(error: unknown): error is { code: string; message?: string } {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string",
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions to process confirmed company upload");
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

  const mappingText = String(formData.get("manualMatches") ?? "{}").trim();
  let manualMatches: Record<string, string> = {};
  try {
    manualMatches = JSON.parse(mappingText) as Record<string, string>;
  } catch {
    return badRequest("manualMatches must be valid JSON");
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return badRequest("Unable to read uploaded file");
  }

  try {
    const season = await db.recruitmentSeason.findUnique({
      where: { id: seasonId },
      select: {
        id: true,
        seasonType: true,
        academicYear: true,
      },
    });

    if (!season) {
      return badRequest("Selected season was not found");
    }

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
      take: 500,
    });

    if (acceptedCycles.length === 0) {
      return badRequest("No accepted companies found for the selected season");
    }

    const cycleByCompanyId = new Map(
      acceptedCycles.map((cycle) => [cycle.companyId, cycle]),
    );
    const cycleByNormalizedName = new Map(
      acceptedCycles.map((cycle) => [
        normalizeCompanyName(cycle.company.name),
        cycle.companyId,
      ]),
    );

    const parsed = parseUploadedWorkbook(buffer);
    if (parsed.matchedSheetNames.length === 0) {
      return badRequest("No supported student-wise sheets were found in the uploaded file");
    }

    const unresolvedCompanies = parsed.companyAggregates.filter((aggregate) => {
      const manualMatch = manualMatches[aggregate.uploadedCompanyName];
      const autoMatch = cycleByNormalizedName.get(aggregate.normalizedKey);
      return !manualMatch && !autoMatch;
    });

    if (unresolvedCompanies.length > 0) {
      return badRequest("Some uploaded companies are still unmatched", {
        unresolvedCompanies: unresolvedCompanies.map((company) => company.uploadedCompanyName),
      });
    }

    const resolvedCompanyIdByNormalizedName = new Map<string, string>();
    for (const aggregate of parsed.companyAggregates) {
      const manualMatch = manualMatches[aggregate.uploadedCompanyName];
      const autoMatch = cycleByNormalizedName.get(aggregate.normalizedKey);
      const resolvedCompanyId = manualMatch || autoMatch;
      if (resolvedCompanyId) {
        resolvedCompanyIdByNormalizedName.set(aggregate.normalizedKey, resolvedCompanyId);
      }
    }

    const userEmails = Array.from(
      new Set(parsed.rows.map((row) => `${row.entryNumber.toLowerCase()}@iitrpr.ac.in`)),
    );

    const users = await db.user.findMany({
      where: {
        email: {
          in: userEmails,
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    const userIdByEmail = new Map(
      users.map((record) => [record.email.toLowerCase(), record.id]),
    );

    const companyIds = Array.from(new Set(resolvedCompanyIdByNormalizedName.values()));
    const studentIds = Array.from(userIdByEmail.values());
    const studentEntryNumbers = Array.from(
      new Set(parsed.rows.map((row) => row.entryNumber)),
    );
    const existingPlacements = await db.placement.findMany({
      where: {
        seasonId,
        companyId: { in: companyIds },
        OR: [
          studentIds.length > 0
            ? {
                studentId: { in: studentIds },
              }
            : undefined,
          studentEntryNumbers.length > 0
            ? {
                studentEntryNumber: { in: studentEntryNumbers },
              }
            : undefined,
        ].filter(Boolean) as Array<Record<string, unknown>>,
      },
      select: {
        id: true,
        studentId: true,
        studentEntryNumber: true,
        companyId: true,
        role: true,
      },
      take: 10000,
    });

    const placementByKey = new Map(
      existingPlacements.map((placement) => [
        getPlacementIdentityKey({
          studentId: placement.studentId,
          studentEntryNumber: placement.studentEntryNumber,
          companyId: placement.companyId,
          role: placement.role,
        }),
        placement,
      ]),
    );

    const studentEntryRows = new Map<string, { companySeasonCycleId: string; driveId: string; entryNumber: string }>();
    const unmatchedStudents = new Set<string>();
    let createdPlacements = 0;
    let updatedPlacements = 0;
    let linkedStudentEntries = 0;
    let processedRows = 0;

    await db.$transaction(async (tx) => {
      for (const row of parsed.rows) {
        const companyId = resolvedCompanyIdByNormalizedName.get(row.normalizedCompanyName);
        if (!companyId) {
          continue;
        }

        const cycle = cycleByCompanyId.get(companyId);
        if (!cycle) {
          continue;
        }

        const studentEmail = `${row.entryNumber.toLowerCase()}@iitrpr.ac.in`;
        const studentId = userIdByEmail.get(studentEmail);
        if (!studentId) unmatchedStudents.add(row.entryNumber);

        const normalizedRoleValue = normalizeWhitespace(row.role) || "Placement Upload";
        const placementKey = getPlacementIdentityKey({
          studentId,
          studentEntryNumber: row.entryNumber,
          companyId,
          role: normalizedRoleValue,
        });
        const driveId = findBestDriveId(normalizedRoleValue, cycle.drives);
        const packageInfo = parseCompensationAmount(row.rawCompensation, season.seasonType);

        const existingPlacement = placementByKey.get(placementKey);

        if (existingPlacement) {
          await tx.placement.update({
            where: { id: existingPlacement.id },
            data: {
              driveId,
              studentId: studentId ?? null,
              studentEntryNumber: row.entryNumber,
              role: normalizedRoleValue,
              packageType: season.seasonType === "placement" ? "ctc" : "stipend",
              packageAmount: packageInfo.packageAmount,
              packageFrequency: season.seasonType === "placement" ? "yearly" : "monthly",
              currency: "INR",
              placementStatus: "accepted",
              source: "confirmed_company_upload",
              updatedAt: new Date(),
            },
          });
          updatedPlacements += 1;
        } else {
          const created = await tx.placement.create({
            data: {
              studentId: studentId ?? null,
              studentEntryNumber: row.entryNumber,
              companyId,
              seasonId,
              driveId,
              role: normalizedRoleValue,
              packageType: season.seasonType === "placement" ? "ctc" : "stipend",
              packageAmount: packageInfo.packageAmount,
              packageFrequency: season.seasonType === "placement" ? "yearly" : "monthly",
              currency: "INR",
              placementStatus: "accepted",
              source: "confirmed_company_upload",
            },
            select: {
              id: true,
              studentId: true,
              studentEntryNumber: true,
              companyId: true,
              role: true,
            },
          });
          placementByKey.set(placementKey, created);
          createdPlacements += 1;
        }
        processedRows += 1;

        if (driveId) {
          const studentEntryKey = `${cycle.id}:${driveId}:${row.entryNumber}`;
          if (!studentEntryRows.has(studentEntryKey)) {
            studentEntryRows.set(studentEntryKey, {
              companySeasonCycleId: cycle.id,
              driveId,
              entryNumber: row.entryNumber,
            });
          }
        }
      }

      const studentEntries = Array.from(studentEntryRows.values());
      if (studentEntries.length > 0) {
        const result = await tx.companySeasonStudentEntry.createMany({
          data: studentEntries.map((row) => ({
            companySeasonCycleId: row.companySeasonCycleId,
            driveId: row.driveId,
            entryNumber: row.entryNumber,
            uploadedBy: user.id,
          })),
          skipDuplicates: true,
        });
        linkedStudentEntries = result.count;
      }
    });

    if (processedRows === 0) {
      return badRequest("No rows could be imported into placements", {
        reason:
          parsed.rows.length === 0
            ? "No valid rows were found in the uploaded workbook"
            : "All rows were filtered out before placement creation",
        unmatchedStudentEntryNumbers: Array.from(unmatchedStudents).sort((a, b) =>
          a.localeCompare(b),
        ),
      });
    }

    return success({
      seasonId,
      seasonType: season.seasonType,
      processedRowCount: processedRows,
      createdPlacements,
      updatedPlacements,
      linkedStudentEntries,
      unmatchedStudentEntryNumbers: Array.from(unmatchedStudents).sort((a, b) =>
        a.localeCompare(b),
      ),
      manualMatchCount: Object.values(manualMatches).filter(Boolean).length,
    });
  } catch (error) {
    console.error("Error processing confirmed company upload:", error);

    if (isPrismaKnownError(error)) {
      if (error.code === "P2003") {
        return badRequest(
          "Confirmed company upload failed because one or more linked records are missing. Run the latest Prisma migration and verify the selected season, companies, and drives still exist.",
        );
      }

      if (error.code === "P2002") {
        return badRequest(
          "Confirmed company upload failed due to a duplicate placement write. Please retry after refreshing the page.",
        );
      }
    }

    return serverError("Unable to process confirmed company upload");
  }
}
