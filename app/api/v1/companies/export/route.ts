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
  "domain",
  "contact name",
  "contact designation",
  "contact emails",
  "contact phones",
  "contact preferred method",
  "contact notes",
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
        domain: true,
        domains: {
          select: {
            domain: true,
          },
          orderBy: {
            domain: "asc",
          },
        },
        contacts: {
          select: {
            name: true,
            designation: true,
            emails: true,
            phones: true,
            preferredContactMethod: true,
            notes: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    const rows: Array<Record<(typeof EXPORT_HEADERS)[number], string>> = [];

    for (const company of companies) {
      const domainValues = Array.from(
        new Set([
          ...(company.domain ? [company.domain] : []),
          ...company.domains.map((entry) => entry.domain),
        ]),
      );
      const domainCell = domainValues.join(", ");

      if (company.contacts.length === 0) {
        rows.push({
          "company name": company.name,
          industry: company.industry ?? "",
          priority: priorityToLabel(company.priority),
          domain: domainCell,
          "contact name": "",
          "contact designation": "",
          "contact emails": "",
          "contact phones": "",
          "contact preferred method": "",
          "contact notes": "",
        });
        continue;
      }

      for (const contact of company.contacts) {
        rows.push({
          "company name": company.name,
          industry: company.industry ?? "",
          priority: priorityToLabel(company.priority),
          domain: domainCell,
          "contact name": contact.name,
          "contact designation": contact.designation ?? "",
          "contact emails": contact.emails.join(", "),
          "contact phones": contact.phones.join(", "),
          "contact preferred method": contact.preferredContactMethod ?? "",
          "contact notes": contact.notes ?? "",
        });
      }
    }

    const workbookBuffer = createWorkbookBuffer(
      "Companies",
      [...EXPORT_HEADERS],
      rows,
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
