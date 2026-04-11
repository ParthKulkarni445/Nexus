import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { success, unauthorized, serverError } from "@/lib/api/response";
import { db } from "@/lib/db";

function isMissingStudentEntriesTable(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  if (code === "P2021") {
    return true;
  }

  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  return message.includes("company_season_student_entries");
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const searchParams = request.nextUrl.searchParams;
  const seasonIdParam = searchParams.get("seasonId");

  try {
    const seasonId = seasonIdParam ?? null;

    const baseQuery = seasonId
      ? {
          where: {
            seasonId,
            status: "accepted" as const,
          },
          orderBy: [{ updatedAt: "desc" as const }],
          include: {
            company: {
              select: {
                id: true,
                name: true,
                notes: true,
                contacts: {
                  select: {
                    id: true,
                    name: true,
                    designation: true,
                    emails: true,
                    phones: true,
                  },
                  orderBy: [
                    { lastContactedAt: "desc" as const },
                    { createdAt: "desc" as const },
                  ],
                },
                drives: {
                  where: {
                    companySeasonCycle: {
                      seasonId,
                    },
                  },
                  select: {
                    id: true,
                    title: true,
                    compensationAmount: true,
                    jobDescriptionText: true,
                    jobDescriptionDocUrl: true,
                    notificationFormUrl: true,
                    eligibilityRules: {
                      select: {
                        id: true,
                        branches: true,
                        includeMinorBranches: true,
                        minCgpa: true,
                        allowsBacklogs: true,
                      },
                    },
                  },
                  orderBy: [
                    { createdAt: "asc" as const },
                  ],
                },
              },
            },
            season: {
              select: {
                id: true,
                name: true,
                seasonType: true,
              },
            },
          },
          take: 500,
        }
      : null;

    let acceptedCycles: any[] = [];

    if (baseQuery) {
      acceptedCycles = await db.companySeasonCycle.findMany(baseQuery);
    }

    const driveEntryNumberMap = new Map<string, string[]>();
    try {
      const driveIds = acceptedCycles
        .flatMap((cycle) => cycle.company.drives)
        .map((drive: { id: string }) => drive.id);

      if (driveIds.length > 0) {
        const driveEntries = await db.companySeasonStudentEntry.findMany({
          where: {
            driveId: {
              in: driveIds,
            },
          },
          select: {
            driveId: true,
            entryNumber: true,
          },
          orderBy: [{ entryNumber: "asc" }],
        });

        for (const entry of driveEntries) {
          if (!entry.driveId) continue;
          const current = driveEntryNumberMap.get(entry.driveId) ?? [];
          current.push(entry.entryNumber);
          driveEntryNumberMap.set(entry.driveId, current);
        }
      }
    } catch (error) {
      if (!isMissingStudentEntriesTable(error)) {
        throw error;
      }
    }

    const telegramTemplatesRaw = await db.emailTemplate.findMany({
      where: {
        status: "approved",
      },
      select: {
        id: true,
        name: true,
        subject: true,
        bodyText: true,
        bodyHtml: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
    });

    const acceptedCompanies = acceptedCycles.map((cycle) => {
      const drives = cycle.company.drives.map(
        (drive: {
          id: string;
          title: string;
          compensationAmount: unknown;
          jobDescriptionText?: string | null;
          jobDescriptionDocUrl?: string | null;
          notificationFormUrl?: string | null;
          eligibilityRules: Array<{
            id: string;
            branches: string[];
            includeMinorBranches: boolean;
            minCgpa: unknown;
            allowsBacklogs: boolean;
          }>;
        }) => {
          const compensationAmount =
            drive.compensationAmount !== null &&
            drive.compensationAmount !== undefined
              ? Number(drive.compensationAmount)
              : null;

          return {
            id: drive.id,
            title: drive.title,
            jobDescriptionText: drive.jobDescriptionText ?? null,
            jobDescriptionDocUrl: drive.jobDescriptionDocUrl ?? null,
            notificationFormUrl: drive.notificationFormUrl ?? null,
            compensationAmount,
            studentEntryNumbers: driveEntryNumberMap.get(drive.id) ?? [],
            eligibilityRules: drive.eligibilityRules.map((rule) => ({
              id: rule.id,
              branches: rule.branches,
              includeMinorBranches: rule.includeMinorBranches,
              minCgpa: rule.minCgpa !== null ? Number(rule.minCgpa) : null,
              allowsBacklogs: rule.allowsBacklogs,
            })),
          };
        },
      );

      return {
      companySeasonCycleId: cycle.id,
      companyId: cycle.company.id,
      companyName: cycle.company.name,
      status: cycle.status,
      notes: cycle.notes ?? cycle.company.notes,
      season: {
        id: cycle.season.id,
        name: cycle.season.name,
        seasonType: cycle.season.seasonType,
      },
      roles: drives
        .map((drive: { title: string }) => drive.title)
        .filter((title: string) => title && title.trim().length > 0),
      drives,
      contacts: cycle.company.contacts.map((contact: { id: string; name: string; designation: string; phones: string[]; emails: string[] }) => ({
        id: contact.id,
        name: contact.name,
        designation: contact.designation,
        phones: contact.phones,
        emails: contact.emails,
      })),
      studentEntryNumbers: Array.from(
        new Set(
          drives.flatMap((drive: { studentEntryNumbers: string[] }) =>
            drive.studentEntryNumbers,
          ),
        ),
      ).sort((left, right) => left.localeCompare(right)),
      };
    });

    const telegramTemplates = telegramTemplatesRaw.map((template) => ({
      id: template.id,
      name: template.name,
      subject: template.subject,
      bodyText: template.bodyText,
      bodyHtml: template.bodyHtml,
      updatedAt: template.updatedAt.toISOString(),
    }));

    return success({
      acceptedCompanies,
      telegramTemplates,
    });
  } catch (error) {
    console.error("Error building confirmed tab payload:", error);
    return serverError();
  }
}
