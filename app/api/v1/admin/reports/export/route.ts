import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import { unauthorized, forbidden, badRequest, serverError } from "@/lib/api/response";
import { createAuditLog, getClientInfo } from "@/lib/api/audit";
import { db } from "@/lib/db";
import { headers } from "next/headers";

const exportQuerySchema = z.object({
  type: z.enum(["users", "seasons", "schedules"]),
});

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return "";
  }

  const columns = Array.from(
    rows.reduce<Set<string>>((acc, row) => {
      Object.keys(row).forEach((key) => acc.add(key));
      return acc;
    }, new Set<string>()),
  );

  const escapeValue = (value: unknown) => {
    const cell = value == null ? "" : String(value);
    const escaped = cell.replaceAll('"', '""');
    return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
  };

  const lines = [columns.join(",")];

  for (const row of rows) {
    const values = columns.map((column) => escapeValue(row[column]));
    lines.push(values.join(","));
  }

  return lines.join("\n");
}

/**
 * GET /api/v1/admin/reports/export?type=users|seasons|schedules
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin"])) {
    return forbidden("Only administrators can export reports");
  }

  const parsed = exportQuerySchema.safeParse({
    type: request.nextUrl.searchParams.get("type") ?? undefined,
  });

  if (!parsed.success) {
    return badRequest("Invalid export type", parsed.error.issues);
  }

  try {
    let csv = "";

    if (parsed.data.type === "users") {
      const users = await db.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          coordinatorType: true,
          isActive: true,
          createdAt: true,
        },
      });

      csv = toCsv(
        users.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
        })),
      );
    }

    if (parsed.data.type === "seasons") {
      const seasons = await db.recruitmentSeason.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          seasonType: true,
          academicYear: true,
          startDate: true,
          endDate: true,
          isActive: true,
          createdAt: true,
        },
      });

      csv = toCsv(
        seasons.map((s) => ({
          ...s,
          startDate: s.startDate ? s.startDate.toISOString().slice(0, 10) : "",
          endDate: s.endDate ? s.endDate.toISOString().slice(0, 10) : "",
          createdAt: s.createdAt.toISOString(),
        })),
      );
    }

    if (parsed.data.type === "schedules") {
      const schedules = await db.schedule.findMany({
        orderBy: { startTime: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          startTime: true,
          endTime: true,
          company: {
            select: {
              name: true,
            },
          },
          createdAt: true,
        },
      });

      csv = toCsv(
        schedules.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          status: s.status,
          company: s.company.name,
          startTime: s.startTime.toISOString(),
          endTime: s.endTime.toISOString(),
          createdAt: s.createdAt.toISOString(),
        })),
      );
    }

    const headersList = await headers();
    const clientInfo = getClientInfo(headersList);

    await createAuditLog({
      actorId: user.id,
      action: "export_admin_report",
      targetType: "report",
      meta: { type: parsed.data.type },
      ...clientInfo,
    });

    const fileName = `nexus-${parsed.data.type}-report-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"${fileName}\"`,
      },
    });
  } catch (error) {
    console.error("Error exporting report:", error);
    return serverError();
  }
}
