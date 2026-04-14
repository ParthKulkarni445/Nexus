import { getCurrentUser } from "@/lib/api/auth";
import { createWorkbookBuffer } from "@/lib/api/excel";
import { unauthorized } from "@/lib/api/response";

const TEMPLATE_HEADERS = [
  "Roll Number",
  "Placed in Company",
  "Job Profile Title",
  "CTC",
  "Placement Status",
] as const;

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  const workbookBuffer = createWorkbookBuffer(
    "ConfirmedCompanyUpload",
    [...TEMPLATE_HEADERS],
    [
      {
        "Roll Number": "2021CSB1111",
        "Placed in Company": "Microsoft",
        "Job Profile Title": "Software Engineer",
        CTC: "1189000",
        "Placement Status": "Placed",
      },
    ],
  );

  return new Response(new Uint8Array(workbookBuffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        "attachment; filename=confirmed-company-upload-template.xlsx",
    },
  });
}
