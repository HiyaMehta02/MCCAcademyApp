import { parseCsv, type CsvTable } from "./csvParse";

/**
 * Turn a Google Sheets share/edit URL into a CSV export URL.
 * The sheet must be shared so anyone with the link can view (or published to web).
 */
export function googleSheetToCsvExportUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Paste a Google Sheet link first.");
  }

  if (trimmed.includes("/export?") && trimmed.includes("format=csv")) {
    return trimmed;
  }

  // Published CSV link already
  if (trimmed.includes("output=csv") || trimmed.endsWith(".csv")) {
    return trimmed;
  }

  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) {
    throw new Error(
      "Could not read that Google Sheet link. Use a normal Sheets URL that contains /spreadsheets/d/..."
    );
  }

  const sheetId = idMatch[1];
  const gidMatch = trimmed.match(/[?&#]gid=([0-9]+)/);
  const gid = gidMatch?.[1] ?? "0";

  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

export async function fetchGoogleSheetCsv(sheetUrl: string): Promise<{
  filename: string;
  table: CsvTable;
  exportUrl: string;
}> {
  const exportUrl = googleSheetToCsvExportUrl(sheetUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  let response: Response;
  try {
    response = await fetch(exportUrl, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "text/csv,text/plain,*/*",
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Timed out downloading the Google Sheet. Check the link and try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(
      `Could not download sheet (HTTP ${response.status}). Make sure the sheet is shared as “Anyone with the link can view”.`
    );
  }

  const text = await response.text();
  if (!text.trim() || text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
    throw new Error(
      "Google returned a web page instead of CSV. Share the sheet as “Anyone with the link can view”, then try again."
    );
  }

  const table = parseCsv(text);
  if (table.headers.length === 0) {
    throw new Error("Downloaded file has no header row.");
  }

  const idMatch = exportUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  const filename = idMatch ? `google-sheet-${idMatch[1]}.csv` : "google-sheet.csv";

  return { filename, table, exportUrl };
}
