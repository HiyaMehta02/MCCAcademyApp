/**
 * Face enrollment + attendance API (your backend talks to Supabase).
 *
 * Set EXPO_PUBLIC_API_BASE_URL to the full base (no trailing slash), e.g.:
 *   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.50:8000
 *
 * Or set EXPO_PUBLIC_IP_ADDRESS only → http://<ip>:8000
 *
 * .env gotchas: no spaces around `=`, no quotes unless the whole value is quoted on one line.
 */
function cleanEnv(raw: string | undefined): string {
  if (raw == null) return "";
  let s = String(raw).trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

export function getApiBaseUrl(): string {
  const base = cleanEnv(process.env.EXPO_PUBLIC_API_BASE_URL).replace(/\/$/, "");
  if (base) {
    if (__DEV__) {
      console.log("[api] EXPO_PUBLIC_API_BASE_URL →", base);
    }
    return base;
  }
  const ip = cleanEnv(process.env.EXPO_PUBLIC_IP_ADDRESS);
  if (!ip) {
    if (__DEV__) console.warn("[api] No EXPO_PUBLIC_API_BASE_URL or EXPO_PUBLIC_IP_ADDRESS");
    return "";
  }
  const url = `http://${ip}:8000`;
  if (__DEV__) console.log("[api] built from IP →", url);
  return url;
}
