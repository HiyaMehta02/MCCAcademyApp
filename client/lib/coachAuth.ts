/** Synthetic internal email domain for Supabase Auth (coaches log in with login_id, not email). */
export const COACH_LOGIN_EMAIL_DOMAIN = "login.mccc.internal";

export function normalizeLoginId(raw: string): string {
  return raw.trim().toLowerCase();
}

export function loginIdToAuthEmail(loginId: string): string {
  const id = normalizeLoginId(loginId);
  if (!id) return "";
  return `${id}@${COACH_LOGIN_EMAIL_DOMAIN}`;
}

export function isValidLoginId(loginId: string): boolean {
  const id = normalizeLoginId(loginId);
  if (id.length < 3 || id.length > 32) return false;
  return /^[a-z0-9][a-z0-9._-]*[a-z0-9]$/.test(id) || /^[a-z0-9]{3,32}$/.test(id);
}

export const MIN_PASSWORD_LENGTH = 8;

export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirm) {
    return "Passwords do not match.";
  }
  return null;
}

export const GENERIC_LOGIN_ERROR =
  "Invalid coach ID or password. Check your credentials or contact your administrator.";
