import { getApiBaseUrl } from "./apiBaseUrl";
import { supabase } from "./supabase";
import { loginIdToAuthEmail, normalizeLoginId } from "./coachAuth";

export type CreateCoachPayload = {
  login_id: string;
  first_name: string;
  last_name: string;
  temp_password: string;
  is_admin?: boolean;
};

export type CreateCoachResult = {
  message: string;
  login_id: string;
  coach_id?: string;
};

async function authHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not signed in");
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function createCoachAccount(payload: CreateCoachPayload): Promise<CreateCoachResult> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error("Set EXPO_PUBLIC_API_BASE_URL in client/.env");
  }

  const form = new FormData();
  form.append("login_id", normalizeLoginId(payload.login_id));
  form.append("first_name", payload.first_name.trim());
  form.append("last_name", payload.last_name.trim());
  form.append("temp_password", payload.temp_password);
  form.append("is_admin", payload.is_admin ? "true" : "false");

  const headers = await authHeaders();
  const response = await fetch(`${base}/admin/coaches`, {
    method: "POST",
    headers,
    body: form,
  });

  const text = await response.text();
  let body: CreateCoachResult & { error?: string; details?: string } = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { error: `HTTP ${response.status}`, message: text };
  }

  if (!response.ok) {
    throw new Error(body.error || body.details || body.message || `HTTP ${response.status}`);
  }

  return body as CreateCoachResult;
}

export async function resetCoachPassword(loginId: string, tempPassword: string): Promise<void> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error("Set EXPO_PUBLIC_API_BASE_URL in client/.env");
  }

  const id = normalizeLoginId(loginId);
  const form = new FormData();
  form.append("temp_password", tempPassword);

  const headers = await authHeaders();
  const response = await fetch(`${base}/admin/coaches/${encodeURIComponent(id)}/reset-password`, {
    method: "POST",
    headers,
    body: form,
  });

  const text = await response.text();
  let body: { error?: string; details?: string; message?: string } = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { error: text || `HTTP ${response.status}` };
  }

  if (!response.ok) {
    throw new Error(body.error || body.details || body.message || `HTTP ${response.status}`);
  }
}

/** For debugging — shows the internal auth email for a login id. */
export function previewAuthEmail(loginId: string): string {
  return loginIdToAuthEmail(loginId);
}
