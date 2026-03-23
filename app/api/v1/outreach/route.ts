import { getCurrentUser } from "@/lib/api/auth";
import { success, unauthorized, serverError } from "@/lib/api/response";
import { db } from "@/lib/db";

function extractLinkedin(notes: string | null) {
  if (!notes) {
    return "";
  }

  const match = notes.match(/LinkedIn:\s*(\S+)/i);
  return match?.[1] ?? "";
}

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
      orderBy: [{ nextFollowUpAt: "asc" }, { updatedAt: "desc" }],
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
            interactions: {
              orderBy: [{ createdAt: "desc" }],
              take: 30,
              select: {
                id: true,
                interactionType: true,
                summary: true,
                outcome: true,
                contactId: true,
                companySeasonCycleId: true,
                nextFollowUpAt: true,
                createdAt: true,
                creator: {
                  select: {
                    name: true,
                  },
                },
                companySeasonCycle: {
                  select: {
                    season: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
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

    const grouped = new Map<
      string,
      {
        id: string;
        companyId: string;
        companyName: string;
        industry: string;
        contacts: Array<{
          id: string;
          name: string;
          designation: string;
          phones: string[];
          emails: string[];
          linkedin: string;
        }>;
        interactions: Array<{
          id: string;
          action: string;
          summary: string;
          outcome: string | null;
          contactId: string | null;
          contactName: string | null;
          companySeasonCycleId: string | null;
          season: string | null;
          nextFollowUpAt: string | null;
          createdAt: string;
          createdBy: string;
        }>;
        seasons: Array<{
          companySeasonCycleId: string;
          seasonId: string;
          season: string;
          seasonType: string;
          status: string;
          lastContacted: string | null;
          nextFollowUp: string | null;
        }>;
      }
    >();

    for (const cycle of cycles) {
      const existing = grouped.get(cycle.company.id);
      const seasonEntry = {
        companySeasonCycleId: cycle.id,
        seasonId: cycle.season.id,
        season: cycle.season.name,
        seasonType: cycle.season.seasonType,
        status: cycle.status,
        lastContacted: cycle.lastContactedAt?.toISOString() ?? null,
        nextFollowUp: cycle.nextFollowUpAt?.toISOString() ?? null,
      };

      if (!existing) {
        grouped.set(cycle.company.id, {
          id: cycle.company.id,
          companyId: cycle.company.id,
          companyName: cycle.company.name,
          industry: cycle.company.industry ?? "Unknown",
          contacts: cycle.company.contacts.map((contact) => ({
            id: contact.id,
            name: contact.name,
            designation: contact.designation ?? "Contact",
            phones: contact.phones,
            emails: contact.emails,
            linkedin: extractLinkedin(contact.notes),
          })),
          interactions: cycle.company.interactions.map((interaction) => {
            const contact =
              cycle.company.contacts.find(
                (item) => item.id === interaction.contactId,
              ) ?? null;

            return {
              id: interaction.id,
              action: interaction.interactionType,
              summary: interaction.summary ?? "",
              outcome: interaction.outcome,
              contactId: interaction.contactId,
              contactName: contact?.name ?? null,
              companySeasonCycleId: interaction.companySeasonCycleId,
              season: interaction.companySeasonCycle?.season.name ?? null,
              nextFollowUpAt: interaction.nextFollowUpAt?.toISOString() ?? null,
              createdAt: interaction.createdAt.toISOString(),
              createdBy: interaction.creator.name,
            };
          }),
          seasons: [seasonEntry],
        });
        continue;
      }

      existing.seasons.push(seasonEntry);
    }

    const entries = Array.from(grouped.values()).map((entry) => {
      const sortedSeasons = entry.seasons.sort((left, right) => {
        const leftFollowUp = left.nextFollowUp
          ? new Date(left.nextFollowUp).getTime()
          : Number.MAX_SAFE_INTEGER;
        const rightFollowUp = right.nextFollowUp
          ? new Date(right.nextFollowUp).getTime()
          : Number.MAX_SAFE_INTEGER;

        if (leftFollowUp !== rightFollowUp) {
          return leftFollowUp - rightFollowUp;
        }

        return left.season.localeCompare(right.season);
      });

      return {
        ...entry,
        seasons: sortedSeasons,
      };
    });

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
