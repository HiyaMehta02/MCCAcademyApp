/** Simple CSV parser with quoted-field support. */

export type CsvTable = {
  headers: string[];
  rows: string[][];
};

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }

  fields.push(current.trim());
  return fields;
}

export function parseCsv(text: string): CsvTable {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) {
    return { headers: [], rows: [] };
  }

  const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => parseCsvLine(line));

  return { headers, rows };
}

export function rowToObject(headers: string[], row: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((header, index) => {
    if (!header) return;
    out[header] = row[index] ?? "";
  });
  return out;
}

export function applyMapping(
  headers: string[],
  rows: string[][],
  mapping: Record<string, string | null>
): Record<string, string>[] {
  return rows
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => {
      const source = rowToObject(headers, row);
      const mapped: Record<string, string> = {};
      for (const [canonical, csvHeader] of Object.entries(mapping)) {
        if (!csvHeader) continue;
        mapped[canonical] = source[csvHeader] ?? "";
      }
      return mapped;
    });
}

export const CANONICAL_IMPORT_FIELDS: {
  key: string;
  label: string;
  required?: boolean;
  hint?: string;
}[] = [
  { key: "first_name", label: "First name", hint: "Or use Full name" },
  { key: "last_name", label: "Last name", hint: "Or use Full name" },
  { key: "full_name", label: "Full name", hint: "Splits into first/last if names empty" },
  { key: "branch_name", label: "Branch name", required: true },
  { key: "batch_name", label: "Batch name", required: true },
  { key: "parent_phone", label: "Parent phone" },
  { key: "gender", label: "Gender (M/F, boy/girl)" },
  { key: "dob", label: "Date of birth" },
  { key: "clothes_size", label: "Clothes / kit size" },
];

export function guessMapping(headers: string[]): Record<string, string | null> {
  const lower = headers.map((h) => h.trim().toLowerCase());
  const mapping: Record<string, string | null> = {};

  const rules: [string, string[]][] = [
    ["first_name", ["first name", "firstname", "first_name", "fname"]],
    ["last_name", ["last name", "lastname", "last_name", "lname", "surname"]],
    ["full_name", ["full name", "name", "student name", "student"]],
    ["branch_name", ["branch", "branch name", "branch_name", "location", "wadi kabir", "azaiba"]],
    ["batch_name", ["batch", "batch name", "batch_name", "class", "group"]],
    ["parent_phone", ["phone", "parent phone", "mobile", "contact", "parent_phone"]],
    ["gender", ["gender", "sex", "m/f"]],
    ["dob", ["dob", "date of birth", "birthday", "birth date", "date_of_birth"]],
    ["clothes_size", ["clothes size", "cloth size", "kit size", "size", "clothes_size"]],
  ];

  for (const [field, aliases] of rules) {
    const idx = lower.findIndex((h) => aliases.includes(h));
    mapping[field] = idx >= 0 ? headers[idx] : null;
  }

  return mapping;
}
