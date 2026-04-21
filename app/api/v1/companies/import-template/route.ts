import { getCurrentUser } from "@/lib/api/auth";
import { unauthorized } from "@/lib/api/response";
import { createWorkbookBuffer } from "@/lib/api/excel";

const TEMPLATE_HEADERS = [
  "company name",
  "industry",
  "priority",
  "domain",
  "contact name",
  "contact emails",
  "contact phones",
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
        "contact name": "Priya Rao, Aman Mehta",
        "contact emails": "priya.rao@acme.com, aman.mehta@acme.com",
        "contact phones": "+91-9876543210, +91-9123456780",
      },
    ],
  );

  return new Response(new Uint8Array(workbookBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=companies-import-format.xlsx",
    },
  });
}
