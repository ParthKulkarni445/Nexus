import { getCurrentUser } from "@/lib/api/auth";
import { unauthorized } from "@/lib/api/response";
import { createWorkbookBuffer } from "@/lib/api/excel";

const TEMPLATE_HEADERS = [
  "company name",
  "industry",
  "priority",
  "domain",
] as const;

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const workbookBuffer = createWorkbookBuffer(
    "CompaniesImportFormat",
    [...TEMPLATE_HEADERS],
    [
      {
        "company name": "Acme Pvt Ltd",
        industry: "IT",
        priority: "high",
        domain: "hr@acme.com, careers.acme.com",
      },
    ],
  );

  return new Response(workbookBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=companies-import-format.xlsx",
    },
  });
}
