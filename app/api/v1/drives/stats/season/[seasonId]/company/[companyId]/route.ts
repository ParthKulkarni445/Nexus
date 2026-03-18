import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/api/auth";
import { success, unauthorized, notFound, serverError } from "@/lib/api/response";

export async function GET(
  _request: NextRequest,
  { params }: { params: { seasonId: string; companyId: string } }
) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const { seasonId, companyId } = params;

  try {
    const cycle = await db.companySeasonCycle.findFirst({
      where: { seasonId, companyId },
      include: {
        company: {
          include: {
            contacts: true,
            blogs: {
              where: { moderationStatus: "approved" },
              orderBy: { createdAt: "desc" },
              take: 10,
            },
          },
        },
        drives: {
          orderBy: { startAt: "desc" },
        },
        interactions: {
          orderBy: { createdAt: "desc" },
        },
        statusHistory: {
          orderBy: { changedAt: "asc" },
          include: {
            changer: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!cycle) {
      return notFound("Company not found for this season");
    }

    const placements = await db.placement.findMany({
      where: { seasonId, companyId },
    });

    const packageValues = placements
      .map((p) => Number(p.packageAmount))
      .filter((v) => !Number.isNaN(v));

    packageValues.sort((a, b) => a - b);

    const studentsPlaced = packageValues.length;
    const totalPackage = packageValues.reduce((sum, v) => sum + v, 0);
    const avgPackage = studentsPlaced > 0 ? totalPackage / studentsPlaced : 0;
    const minPackage = studentsPlaced > 0 ? packageValues[0] : 0;
    const maxPackage = studentsPlaced > 0 ? packageValues[studentsPlaced - 1] : 0;
    const medianPackage =
      studentsPlaced === 0
        ? 0
        : studentsPlaced % 2 === 1
        ? packageValues[(studentsPlaced - 1) / 2]
        : (packageValues[studentsPlaced / 2 - 1] +
            packageValues[studentsPlaced / 2]) /
          2;

    const statusTimeline = cycle.statusHistory.map((h) => ({
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      changeNote: h.changeNote,
      changedAt: h.changedAt,
      changedBy: h.changer ? { id: h.changer.id, name: h.changer.name } : null,
    }));

    const recentDrives = cycle.drives.map((d) => ({
      id: d.id,
      title: d.title,
      stage: d.stage,
      status: d.status,
      startAt: d.startAt,
      endAt: d.endAt,
      isConflictFlagged: d.isConflictFlagged,
    }));

    const contacts = cycle.company.contacts.map((contact) => ({
      name: contact.name,
      role: contact.designation || "HR",
      email: contact.emails[0] || "",
      phone: contact.phones[0] || "",
      lastContacted: contact.lastContactedAt,
    }));

    const linkedBlogs = cycle.company.blogs.map((b) => ({
      id: b.id,
      title: b.title,
      createdAt: b.createdAt,
    }));

    return success({
      company: {
        id: cycle.company.id,
        name: cycle.company.name,
        industry: cycle.company.industry,
        website: cycle.company.website,
      },
      cycle: {
        id: cycle.id,
        status: cycle.status,
        lastContactedAt: cycle.lastContactedAt,
        nextFollowUpAt: cycle.nextFollowUpAt,
        updatedAt: cycle.updatedAt,
      },
      statusTimeline,
      recentDrives,
      contacts,
      linkedBlogs,
      placementSummary: {
        studentsPlaced,
        avgPackage,
        medianPackage,
        maxPackage,
        minPackage,
      },
    });
  } catch (error) {
    console.error("Error fetching company season stats:", error);
    return serverError();
  }
}
