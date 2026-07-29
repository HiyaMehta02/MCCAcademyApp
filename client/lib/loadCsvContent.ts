import { parseCsv, type CsvTable } from "./csvParse";

export function loadCsvFromText(text: string, filename = "pasted.csv"): { filename: string; table: CsvTable } {
  const table = parseCsv(text);
  if (table.headers.length === 0) {
    throw new Error("Could not find a header row. Paste CSV with a header line first.");
  }
  return { filename, table };
}
