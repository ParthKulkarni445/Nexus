import { TabularRecord } from "@/lib/api/excel";

export const ENTRY_NUMBER_PATTERN = /^\d{4}[A-Z]{3}\d{4}$/;

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function findHeaderByName(headers: string[], expectedNames: string[]) {
  const expected = new Set(expectedNames.map((name) => normalizeHeader(name)));
  return headers.find((header) => expected.has(normalizeHeader(header))) ?? null;
}

export function normalizeEntryNumber(rawValue: string | null | undefined) {
  const compact = (rawValue ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (!compact) return null;
  return ENTRY_NUMBER_PATTERN.test(compact) ? compact : null;
}

export function extractEntryNumberFromValue(rawValue: string | null | undefined) {
  const value = (rawValue ?? "").trim();
  if (!value) return null;

  if (value.includes("@")) {
    const localPart = value.split("@")[0] ?? "";
    return normalizeEntryNumber(localPart);
  }

  return normalizeEntryNumber(value);
}

export function parseEntryNumbersFromColumn(records: TabularRecord[], header: string) {
  const values = new Set<string>();
  const invalidRows: number[] = [];

  records.forEach((record, index) => {
    const parsed = extractEntryNumberFromValue(record[header]);
    if (!record[header]?.trim()) {
      return;
    }
    if (!parsed) {
      invalidRows.push(index + 2);
      return;
    }
    values.add(parsed);
  });

  return {
    entryNumbers: Array.from(values).sort((left, right) => left.localeCompare(right)),
    invalidRows,
  };
}

export function firstPresentHeader(headers: string[], candidates: string[]) {
  const candidateSet = new Set(candidates.map((candidate) => normalizeHeader(candidate)));
  return (
    headers.find((header) => candidateSet.has(normalizeHeader(header))) ??
    headers.find((header) => {
      const normalized = normalizeHeader(header);
      return normalized.includes("student email");
    }) ??
    null
  );
}
