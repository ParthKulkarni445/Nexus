"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/api/auth";

export async function getSeasons() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return db.recruitmentSeason.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getDrivesData(seasonId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const cycles = await db.companySeasonCycle.findMany({
    where: { seasonId },
    include: {
      company: {
        include: {
          contacts: true,
          blogs: {
            where: { moderationStatus: "approved" },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
          seasonCycles: {
            include: {
              season: true,
            },
          },
        },
      },
      drives: {
        orderBy: { startAt: "desc" },
      },
      interactions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return cycles.map((cycle) => {
    const c = cycle.company;
    const allSeasons = c.seasonCycles.map((sc) => sc.season);
    
    // Sort seasons by academic year or start date
    allSeasons.sort((a, b) => {
      const yearA = parseInt(a.academicYear) || 0;
      const yearB = parseInt(b.academicYear) || 0;
      return yearB - yearA;
    });

    const lastVisitedYear = allSeasons.length > 0 ? parseInt(allSeasons[0].academicYear) || new Date().getFullYear() : new Date().getFullYear();
    const totalYears = new Set(allSeasons.map(s => s.academicYear)).size;

    return {
      id: c.id,
      name: c.name,
      industry: c.industry || "N/A",
      totalYears,
      lastVisitedYear,
      // We do not have avgPackage or totalHired in DB yet, return 0
      avgPackage: 0, 
      totalHired: 0,
      stats: [] as any[], // No year-wise stats available in DB yet
      contacts: c.contacts.map((contact) => ({
        name: contact.name,
        role: contact.designation || "HR",
        email: contact.emails[0] || "",
        phone: contact.phones[0] || "",
        lastContacted: contact.lastContactedAt ? contact.lastContactedAt.toISOString() : null,
      })),
      drives: cycle.drives.map((d) => ({
        date: d.startAt ? d.startAt.toISOString() : null,
        stage: d.stage,
        status: (d.status === "completed" ? "completed" : d.status === "confirmed" ? "in_progress" : "scheduled") as "completed" | "in_progress" | "scheduled",
        isConflictFlagged: !!d.isConflictFlagged,
      })),
      linkedBlogs: c.blogs.map((b) => ({
        title: b.title,
        date: b.createdAt.toISOString(),
        source: "student" as const, // Currently, all blogs are assumed from students unless we track it differently
      })),
    };
  });
}
