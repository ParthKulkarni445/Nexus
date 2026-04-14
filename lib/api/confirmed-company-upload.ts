import { parseWorkbookSheetsBuffer } from "@/lib/api/excel";
import { extractEntryNumberFromValue, findHeaderByName } from "@/lib/api/student-entries";

export const ENTRY_HEADERS = ["Roll Number", "Entry Number"];
export const COMPANY_HEADERS = ["Placed in Company", "Placed In Company", "Company"];
export const ROLE_HEADERS = ["Job Profile Title", "Role", "Job Title", "Profile"];
export const STATUS_HEADERS = ["Placement Status"];
export const COMPENSATION_HEADERS = ["CTC", "CTC (INR LPA)"];

export type UploadCompanyAggregate = {
  uploadedCompanyName: string;
  normalizedKey: string;
  rowCount: number;
  entryNumbers: Set<string>;
  roles: Set<string>;
  sheets: Set<string>;
};

export type ParsedUploadRow = {
  sheetName: string;
  uploadedCompanyName: string;
  normalizedCompanyName: string;
  entryNumber: string;
  role: string;
  rawCompensation: string;
};

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeCompanyName(value: string) {
  return normalizeWhitespace(
    value
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " "),
  );
}

export function isRelevantStatus(value: string | undefined) {
  const normalized = normalizeCompanyName(value ?? "");

  if (!normalized) {
    return true;
  }

  if (normalized === "placed" || normalized === "accepted" || normalized === "offered") {
    return true;
  }

  return !(normalized.includes("unplaced") || normalized === "no");
}

export function parseUploadedWorkbook(buffer: Buffer) {
  const sheetPayload = parseWorkbookSheetsBuffer(buffer);
  const companyAggregateMap = new Map<string, UploadCompanyAggregate>();
  const rows: ParsedUploadRow[] = [];
  const matchedSheetNames: string[] = [];
  let parsedStudentRows = 0;
  let skippedStudentRows = 0;

  for (const sheet of sheetPayload) {
    const entryHeader = findHeaderByName(sheet.headers, ENTRY_HEADERS);
    const companyHeader = findHeaderByName(sheet.headers, COMPANY_HEADERS);

    if (!entryHeader || !companyHeader) {
      continue;
    }

    matchedSheetNames.push(sheet.sheetName);

    const roleHeader = findHeaderByName(sheet.headers, ROLE_HEADERS);
    const statusHeader = findHeaderByName(sheet.headers, STATUS_HEADERS);
    const compensationHeader = findHeaderByName(sheet.headers, COMPENSATION_HEADERS);

    for (const record of sheet.records) {
      const companyName = normalizeWhitespace(record[companyHeader] ?? "");
      if (!companyName) {
        continue;
      }

      if (!isRelevantStatus(statusHeader ? record[statusHeader] : "")) {
        skippedStudentRows += 1;
        continue;
      }

      const normalizedCompany = normalizeCompanyName(companyName);
      if (
        !normalizedCompany ||
        normalizedCompany === "unplaced" ||
        normalizedCompany === "no" ||
        normalizedCompany === "na" ||
        normalizedCompany === "n a" ||
        normalizedCompany === "not placed" ||
        normalizedCompany === "off campus placed"
      ) {
        skippedStudentRows += 1;
        continue;
      }

      const entryNumber = extractEntryNumberFromValue(record[entryHeader]);
      if (!entryNumber) {
        skippedStudentRows += 1;
        continue;
      }

      parsedStudentRows += 1;

      const role = normalizeWhitespace(roleHeader ? record[roleHeader] ?? "" : "");
      const rawCompensation = normalizeWhitespace(
        compensationHeader ? record[compensationHeader] ?? "" : "",
      );

      rows.push({
        sheetName: sheet.sheetName,
        uploadedCompanyName: companyName,
        normalizedCompanyName: normalizedCompany,
        entryNumber,
        role,
        rawCompensation,
      });

      const aggregate =
        companyAggregateMap.get(normalizedCompany) ??
        {
          uploadedCompanyName: companyName,
          normalizedKey: normalizedCompany,
          rowCount: 0,
          entryNumbers: new Set<string>(),
          roles: new Set<string>(),
          sheets: new Set<string>(),
        };

      aggregate.rowCount += 1;
      aggregate.entryNumbers.add(entryNumber);
      aggregate.sheets.add(sheet.sheetName);
      if (role) {
        aggregate.roles.add(role);
      }

      companyAggregateMap.set(normalizedCompany, aggregate);
    }
  }

  return {
    matchedSheetNames,
    parsedStudentRows,
    skippedStudentRows,
    rows,
    companyAggregates: Array.from(companyAggregateMap.values()),
  };
}
