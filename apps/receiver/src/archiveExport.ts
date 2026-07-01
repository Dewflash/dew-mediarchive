import type { ArchiveRecord } from "./types.js";

const CSV_COLUMNS: Array<{
  key: keyof ArchiveRecord;
  label: string;
}> = [
  { key: "id", label: "id" },
  { key: "jobId", label: "job_id" },
  { key: "sourceUrl", label: "source_url" },
  { key: "pageUrl", label: "page_url" },
  { key: "pageTitle", label: "page_title" },
  { key: "kind", label: "kind" },
  { key: "outputPath", label: "output_path" },
  { key: "byteSize", label: "byte_size" },
  { key: "sha256", label: "sha256" },
  { key: "capturedAt", label: "captured_at" },
  { key: "createdAt", label: "created_at" }
];

export function renderArchiveJsonExport(records: ArchiveRecord[]): string {
  return `${JSON.stringify({ records }, null, 2)}\n`;
}

export function renderArchiveCsvExport(records: ArchiveRecord[]): string {
  const header = CSV_COLUMNS.map((column) => column.label).join(",");
  const rows = records.map((record) =>
    CSV_COLUMNS.map((column) => formatCsvCell(record[column.key])).join(",")
  );

  return `${[header, ...rows].join("\n")}\n`;
}

function formatCsvCell(value: ArchiveRecord[keyof ArchiveRecord]): string {
  const rawValue = value === undefined ? "" : String(value);
  const safeValue = escapeSpreadsheetFormula(rawValue);
  return `"${safeValue.replaceAll('"', '""')}"`;
}

function escapeSpreadsheetFormula(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}
