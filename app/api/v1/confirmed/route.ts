import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { success, unauthorized, serverError, badRequest } from "@/lib/api/response";
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
  const driveId = searchParams.get("driveId");

  try {
    const confirmedDrives = await db.drive.findMany({
      where: { status: "confirmed" },
      orderBy: [{ startAt: "desc" }, { createdAt: "desc" }],
      include: {
        company: {
          select: {
            id: true,
            name: true,
            notes: true,
          },
        },
        companySeasonCycle: {
          select: {
            id: true,
            seasonId: true,
            season: {
              select: {
                id: true,
                name: true,
                seasonType: true,
              },
            },
          },
        },
      },
      take: 200,
    });

    if (confirmedDrives.length === 0) {
      return success({
        drives: [],
        selectedDriveId: null,
        acceptedCompanies: [],
        telegramTemplates: [],
      });
    }

    const selectedDrive = driveId
      ? confirmedDrives.find((drive) => drive.id === driveId)
      : confirmedDrives[0];

    if (!selectedDrive) {
      return badRequest("Selected drive was not found in confirmed drives");
    }

    const seasonId = selectedDrive.companySeasonCycle.seasonId;

    const baseQuery = {
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
              orderBy: [{ lastContactedAt: "desc" as const }, { createdAt: "desc" as const }],
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
                stage: true,
                status: true,
                startAt: true,
              },
              orderBy: [{ startAt: "asc" as const }, { createdAt: "asc" as const }],
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
    };

    let acceptedCycles: any[] = [];

    try {
      acceptedCycles = await db.companySeasonCycle.findMany({
        ...baseQuery,
        include: {
          ...baseQuery.include,
          studentEntries: {
            select: {
              entryNumber: true,
            },
            orderBy: [{ entryNumber: "asc" }],
          },
        },
      });
    } catch (error) {
      if (!isMissingStudentEntriesTable(error)) {
        throw error;
      }

      acceptedCycles = await db.companySeasonCycle.findMany(baseQuery);
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

    const drives = confirmedDrives.map((drive) => ({
      id: drive.id,
      title: drive.title,
      stage: drive.stage,
      status: drive.status,
      companyId: drive.companyId,
      companyName: drive.company.name,
      companySeasonCycleId: drive.companySeasonCycleId,
      seasonId: drive.companySeasonCycle.season.id,
      seasonName: drive.companySeasonCycle.season.name,
      seasonType: drive.companySeasonCycle.season.seasonType,
      startAt: drive.startAt?.toISOString() ?? null,
      endAt: drive.endAt?.toISOString() ?? null,
    }));

    const acceptedCompanies = acceptedCycles.map((cycle) => ({
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
      roles: cycle.company.drives
        .map((drive: { title: string }) => drive.title)
        .filter((title: string) => title && title.trim().length > 0),
      contacts: cycle.company.contacts.map((contact: { id: string; name: string; designation: string; phones: string[]; emails: string[] }) => ({
        id: contact.id,
        name: contact.name,
        designation: contact.designation,
        phones: contact.phones,
        emails: contact.emails,
      })),
      studentEntryNumbers: (cycle.studentEntries ?? []).map((entry: { entryNumber: string }) => entry.entryNumber),
    }));

    const telegramTemplates = telegramTemplatesRaw.map((template) => ({
      id: template.id,
      name: template.name,
      subject: template.subject,
      bodyText: template.bodyText,
      bodyHtml: template.bodyHtml,
      updatedAt: template.updatedAt.toISOString(),
    }));

    return success({
      drives,
      selectedDriveId: selectedDrive.id,
      acceptedCompanies,
      telegramTemplates,
    });
  } catch (error) {
    console.error("Error building confirmed tab payload:", error);
    return serverError();
  }
}
