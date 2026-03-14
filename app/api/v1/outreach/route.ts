import { getCurrentUser } from "@/lib/api/auth";
import { success, unauthorized, serverError } from "@/lib/api/response";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  try {
    const cycles = await db.companySeasonCycle.findMany({
      where: {
        ownerUserId: user.id,
      },
      orderBy: [
        { nextFollowUpAt: "asc" },
        { updatedAt: "desc" },
      ],
      select: {
        id: true,
        status: true,
        lastContactedAt: true,
        nextFollowUpAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
            industry: true,
            contacts: {
              orderBy: [{ lastContactedAt: "desc" }, { createdAt: "desc" }],
              select: {
                id: true,
                name: true,
                designation: true,
                emails: true,
                phones: true,
                notes: true,
                lastContactedAt: true,
              },
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
    });

    const entries = cycles.map((cycle) => ({
      id: cycle.id,
      companySeasonCycleId: cycle.id,
      companyId: cycle.company.id,
      companyName: cycle.company.name,
      industry: cycle.company.industry ?? "Unknown",
      status: cycle.status,
      seasonId: cycle.season.id,
      season: cycle.season.name,
      seasonType: cycle.season.seasonType,
      assignedTo: user.name,
      assignedId: user.id,
      lastContacted:
        cycle.lastContactedAt?.toISOString() ??
        cycle.company.contacts.find((contact) => contact.lastContactedAt)
          ?.lastContactedAt?.toISOString() ??
        null,
      nextFollowUp: cycle.nextFollowUpAt?.toISOString() ?? null,
      contacts: cycle.company.contacts.map((contact) => ({
        id: contact.id,
        name: contact.name,
        designation: contact.designation ?? "Contact",
        phones: contact.phones,
        emails: contact.emails,
        linkedin: extractLinkedin(contact.notes),
      })),
    }));

    return success({
      user: {
        id: user.id,
        name: user.name,
      },
      entries,
    });
  } catch (error) {
    console.error("Error fetching outreach queue:", error);
    return serverError();
  }
}

function extractLinkedin(notes: string | null) {
  if (!notes) {
    return "";
  }

  const match = notes.match(/LinkedIn:\s*(\S+)/i);
  return match?.[1] ?? "";
}
