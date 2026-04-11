import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/api/response";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions to export stats");
  }

  const searchParams = request.nextUrl.searchParams;
  const seasonId = searchParams.get("seasonId");
  const companyId = searchParams.get("companyId") || undefined;

  if (!seasonId) {
    return badRequest("seasonId is required for export");
  }

  try {
    const where: Prisma.CompanySeasonCycleWhereInput = {
      seasonId,
      ...(companyId ? { companyId } : {}),
    };

    const cycles = await db.companySeasonCycle.findMany({
      where,
      include: {
        company: {
          include: {
            contacts: true,
          },
        },
        drives: true,
      },
    });

    const header = [
      "Company Name",
      "Industry",
      "Season Status",
      "Total Roles",
      "Roles Offered",
      "Contacts Count",
    ];

    const lines = cycles.map((cycle) => {
      const { company } = cycle;
      const drives = cycle.drives;
      const totalRoles = drives.length;
      const roleTitles = drives.map((d) => d.title).filter(Boolean).join(" | ");

      const row = [
        company.name,
        company.industry || "",
        cycle.status,
        totalRoles.toString(),
        roleTitles,
        company.contacts.length.toString(),
      ];

      return row
        .map((value) => {
          const safe = value.replace(/"/g, '""');
          return /[",\n]/.test(safe) ? `"${safe}"` : safe;
        })
        .join(",");
    });

    const csv = [header.join(","), ...lines].join("\n");

    const headersList = await headers();
    const clientInfo = getClientInfo(headersList);

    await createAuditLog({
      actorId: user.id,
      action: "export_drives_stats",
      targetType: "season",
      targetId: seasonId,
      meta: { companyId, rows: cycles.length },
      ...clientInfo,
    });

    const filename = `drives_stats_${seasonId}${companyId ? `_${companyId}` : ""}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting drives stats:", error);
    return serverError();
  }
}
