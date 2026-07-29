import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCoachAuthHeaders } from "./apiAuth";
import { getApiBaseUrl } from "./apiBaseUrl";

const TEMPLATE_STORAGE_KEY = "@mccc/import_mapping_templates";

export type ImportMapping = Record<string, string | null>;

export type ImportRowResult = {
  row: number;
  status: "ok" | "error";
  action?: string;
  student_id?: string;
  error?: string;
  details?: Record<string, unknown>;
};

export type ImportRunResult = {
  dry_run: boolean;
  total_rows: number;
  success_count: number;
  error_count: number;
  created?: {
    branches: number;
    batches: number;
    students: number;
    enrollments: number;
  };
  would_create?: {
    branches: number;
    batches: number;
    students: number;
    enrollments: number;
  };
  row_results: ImportRowResult[];
  import_id?: string;
};

export type MappingTemplate = {
  name: string;
  mapping: ImportMapping;
  updated_at: string;
};

export async function runCsvImport(params: {
  records: Record<string, string>[];
  dryRun: boolean;
  filename?: string;
}): Promise<ImportRunResult> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error("Set EXPO_PUBLIC_API_BASE_URL in client/.env");
  }

  const headers = {
    ...(await getCoachAuthHeaders()),
    "Content-Type": "application/json",
  };

  const response = await fetch(`${base}/admin/import/csv`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      dry_run: params.dryRun,
      filename: params.filename ?? null,
      records: params.records,
    }),
  });

  const text = await response.text();
  let body: ImportRunResult & { error?: string; details?: string } = {
    dry_run: params.dryRun,
    total_rows: 0,
    success_count: 0,
    error_count: 0,
    row_results: [],
  };

  try {
    body = text ? JSON.parse(text) : body;
  } catch {
    throw new Error(text || `HTTP ${response.status}`);
  }

  if (!response.ok) {
    throw new Error(body.error || body.details || `HTTP ${response.status}`);
  }

  return body;
}

export async function loadMappingTemplates(): Promise<MappingTemplate[]> {
  const raw = await AsyncStorage.getItem(TEMPLATE_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as MappingTemplate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveMappingTemplate(name: string, mapping: ImportMapping): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Template name is required.");
  }

  const existing = await loadMappingTemplates();
  const next: MappingTemplate = {
    name: trimmed,
    mapping,
    updated_at: new Date().toISOString(),
  };

  const without = existing.filter((t) => t.name.toLowerCase() !== trimmed.toLowerCase());
  without.unshift(next);
  await AsyncStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(without.slice(0, 20)));
}

export async function deleteMappingTemplate(name: string): Promise<void> {
  const existing = await loadMappingTemplates();
  const next = existing.filter((t) => t.name.toLowerCase() !== name.trim().toLowerCase());
  await AsyncStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(next));
}
