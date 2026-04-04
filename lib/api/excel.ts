import * as XLSX from "xlsx";

export type TabularRecord = Record<string, string>;

export function createWorkbookBuffer(
  sheetName: string,
  headers: string[],
  rows: TabularRecord[],
) {
  const worksheetRows = [
    headers,
    ...rows.map((row) => headers.map((header) => row[header] ?? "")),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;
}

export function parseWorkbookBuffer(buffer: Buffer): {
  headers: string[];
  records: TabularRecord[];
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

  const headers = rows[0].map((header, index) => {
    const trimmed = String(header).trim();
    return index === 0 ? trimmed.replace(/^\ufeff/, "") : trimmed;
  });

  const records = rows.slice(1).map((row) => {
    const record: TabularRecord = {};
    for (let i = 0; i < headers.length; i += 1) {
      record[headers[i]] = String(row[i] ?? "").trim();
    }
    return record;
  });

  return { headers, records };
}
