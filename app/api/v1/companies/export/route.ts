import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/api/auth";
import { badRequest, unauthorized, serverError } from "@/lib/api/response";
import { db } from "@/lib/db";
import { createWorkbookBuffer } from "@/lib/api/excel";

const exportQuerySchema = z.object({
  search: z.string().optional(),
  industry: z.string().optional(),
});

const EXPORT_HEADERS = [
  "company name",
  "industry",
  "priority",
] as const;

function priorityToLabel(priority: number | null) {
  if ((priority ?? 0) >= 3) {
    return "high";
  }
  if ((priority ?? 0) >= 2) {
    return "medium";
  }
  return "low";
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const parsed = exportQuerySchema.safeParse({
    search: request.nextUrl.searchParams.get("search") || undefined,
    industry: request.nextUrl.searchParams.get("industry") || undefined,
  });

  if (!parsed.success) {
    return badRequest("Invalid query parameters", parsed.error.issues);
  }

  try {
    const where = {
      ...(parsed.data.search
        ? {
            OR: [
              {
                name: {
                  contains: parsed.data.search,
                  mode: "insensitive" as const,
                },
              },
              {
                domain: {
                  contains: parsed.data.search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
      ...(parsed.data.industry
        ? {
            industry: {
              contains: parsed.data.industry,
              mode: "insensitive" as const,
            },
          }
        : {}),
    };

    const companies = await db.company.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        name: true,
        industry: true,
        priority: true,
      },
    });

    const workbookBuffer = createWorkbookBuffer(
      "Companies",
      [...EXPORT_HEADERS],
      companies.map((company) => ({
        "company name": company.name,
        industry: company.industry ?? "",
        priority: priorityToLabel(company.priority),
      })),
    );

    const dateStamp = new Date().toISOString().slice(0, 10);

    return new Response(new Uint8Array(workbookBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=companies-${dateStamp}.xlsx`,
      },
    });
  } catch (error) {
    console.error("Error exporting companies:", error);
    return serverError();
  }
}
