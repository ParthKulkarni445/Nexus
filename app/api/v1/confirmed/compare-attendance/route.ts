import * as XLSX from "xlsx";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import { badRequest, forbidden, serverError, success, unauthorized } from "@/lib/api/response";
import {
  extractEntryNumberFromValue,
  firstPresentHeader,
  findHeaderByName,
} from "@/lib/api/student-entries";
import { db } from "@/lib/db";

const ATTENDANCE_ENTRY_HEADERS = [
  "roll no",
  "entry no",
  "entry number",
  "student email",
  "student email address",
  "email",
];

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseAttendanceWorkbook(buffer: Buffer): {
  headers: string[];
  records: Array<Record<string, string>>;
} {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return { headers: [], records: [] };
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: false,
  });

  if (rows.length === 0) {
    return { headers: [], records: [] };
  }

  // Support fixed attendance exports where metadata exists above the actual header row.
  const headerRowIndex = rows.findIndex((row) => {
    const normalizedCells = row.map((cell) => normalizeHeader(String(cell)));
    return normalizedCells.some((cell) =>
      ATTENDANCE_ENTRY_HEADERS.some((candidate) => cell === candidate || cell.includes(candidate)),
    );
  });

  if (headerRowIndex < 0) {
    return { headers: [], records: [] };
  }

  const headers = rows[headerRowIndex].map((header, index) => {
    const trimmed = String(header).trim();
    return index === 0 ? trimmed.replace(/^\ufeff/, "") : trimmed;
  });

  const records = rows
    .slice(headerRowIndex + 1)
    .filter((row) => row.some((value) => String(value ?? "").trim().length > 0))
    .map((row) => {
      const record: Record<string, string> = {};
      for (let i = 0; i < headers.length; i += 1) {
        record[headers[i]] = String(row[i] ?? "").trim();
      }
      return record;
    });

  return { headers, records };
}

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
    return forbidden("Insufficient permissions to compare attendance");
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
    return badRequest("Attendance file is required");
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

    const storedEntries: Array<{ entryNumber: string }> = await prisma.companySeasonStudentEntry.findMany({
      where: { companySeasonCycleId, driveId },
      select: { entryNumber: true },
      orderBy: { entryNumber: "asc" },
    });

    if (storedEntries.length === 0) {
      return badRequest("No uploaded student info found for this drive. Upload Roll No sheet first.");
    }

    const { headers, records } = parseAttendanceWorkbook(buffer);

    if (headers.length === 0) {
      return badRequest("Attendance file is empty");
    }

    const attendanceHeader =
      firstPresentHeader(headers, ATTENDANCE_ENTRY_HEADERS) ??
      findHeaderByName(headers, ATTENDANCE_ENTRY_HEADERS);

    if (!attendanceHeader) {
      return badRequest("Could not find attendance entry column", {
        expectedColumns: ATTENDANCE_ENTRY_HEADERS,
      });
    }

    const statusHeader = findHeaderByName(headers, ["status"]);
    const attendanceByEntry = new Map<string, string>();

    for (const record of records) {
      const parsedEntry = extractEntryNumberFromValue(record[attendanceHeader]);
      if (!parsedEntry) {
        continue;
      }

      const status = statusHeader ? (record[statusHeader] ?? "").trim() : "";
      attendanceByEntry.set(parsedEntry, status || "Present");
    }

    const uploadedEntrySet = new Set(storedEntries.map((item) => item.entryNumber));

    const rows: Array<{ entryNumber: string; attendanceStatus: string; matched: boolean }> =
      storedEntries.map(({ entryNumber }) => ({
      entryNumber,
      attendanceStatus: attendanceByEntry.get(entryNumber) ?? "Not Found",
      matched: attendanceByEntry.has(entryNumber),
      }));

    const unmatchedAttendanceEntries = Array.from(attendanceByEntry.keys())
      .filter((entryNumber) => !uploadedEntrySet.has(entryNumber))
      .sort((left, right) => left.localeCompare(right));

    return success({
      companySeasonCycleId,
      driveId,
      detectedAttendanceColumn: attendanceHeader,
      matchedCount: rows.filter((row) => row.matched).length,
      missingCount: rows.filter((row) => !row.matched).length,
      uploadedCount: storedEntries.length,
      rows,
      unmatchedAttendanceEntries,
    });
  } catch (error) {
    if (isMissingStudentEntriesTable(error)) {
      return badRequest(
        "Student entry storage is not ready. Run the latest Prisma migration and retry.",
      );
    }
    console.error("Error comparing confirmed attendance:", error);
    return serverError("Unable to compare attendance");
  }
}
