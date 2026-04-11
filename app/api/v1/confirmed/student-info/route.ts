import { getCurrentUser, hasRole } from "@/lib/api/auth";
import { parseWorkbookBuffer } from "@/lib/api/excel";
import { badRequest, forbidden, serverError, success, unauthorized } from "@/lib/api/response";
import { findHeaderByName, parseEntryNumbersFromColumn } from "@/lib/api/student-entries";
import { db } from "@/lib/db";

const REQUIRED_ROLL_HEADER = ["roll no"];

function isMissingStudentEntriesTable(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  if (code === "P2021") {
    return true;
  }

  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  return message.includes("company_season_student_entries");
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const prisma = db as any;

  if (!user) {
    return unauthorized();
  }

  if (!hasRole(user, ["tpo_admin", "coordinator"])) {
    return forbidden("Insufficient permissions to upload student info");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return badRequest("Invalid multipart request body");
  }

  const companySeasonCycleId = String(formData.get("companySeasonCycleId") ?? "").trim();
  const driveId = String(formData.get("driveId") ?? "").trim();
  if (!companySeasonCycleId) {
    return badRequest("companySeasonCycleId is required");
  }
  if (!driveId) {
    return badRequest("driveId is required");
  }

  const fileValue = formData.get("file");
  if (!(fileValue instanceof File)) {
    return badRequest("Student info file is required");
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await fileValue.arrayBuffer());
  } catch {
    return badRequest("Unable to read uploaded file");
  }

  try {
    const drive = await prisma.drive.findUnique({
      where: { id: driveId },
      select: { id: true, companySeasonCycleId: true },
    });

    if (!drive || drive.companySeasonCycleId !== companySeasonCycleId) {
      return badRequest("Invalid driveId for selected companySeasonCycleId");
    }

    const { headers, records } = parseWorkbookBuffer(buffer);

    if (headers.length === 0) {
      return badRequest("Uploaded file is empty");
    }

    const rollHeader = findHeaderByName(headers, REQUIRED_ROLL_HEADER);

    if (!rollHeader) {
      return badRequest("Missing required column 'Roll No'", {
        requiredHeaders: ["Roll No"],
      });
    }

    const { entryNumbers, invalidRows } = parseEntryNumbersFromColumn(records, rollHeader);

    if (entryNumbers.length === 0) {
      return badRequest("No valid entry numbers found in Roll No column", {
        entryFormat: "YYYYBBBNNNN",
      });
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.companySeasonStudentEntry.deleteMany({
        where: { companySeasonCycleId, driveId },
      });

      await tx.companySeasonStudentEntry.createMany({
        data: entryNumbers.map((entryNumber) => ({
          companySeasonCycleId,
          driveId,
          entryNumber,
          uploadedBy: user.id,
        })),
        skipDuplicates: true,
      });
    });

    return success({
      companySeasonCycleId,
      driveId,
      uploadedCount: entryNumbers.length,
      invalidRows,
      sampleEntryNumbers: entryNumbers.slice(0, 10),
    });
  } catch (error) {
    if (isMissingStudentEntriesTable(error)) {
      return badRequest(
        "Student entry storage is not ready. Run the latest Prisma migration and retry.",
      );
    }
    console.error("Error uploading confirmed student info:", error);
    return serverError("Unable to process student info upload");
  }
}
