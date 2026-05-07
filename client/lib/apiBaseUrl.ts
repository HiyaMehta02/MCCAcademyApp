/**
 * Face enrollment + attendance API (your backend writes to Supabase DB).
 *
 * Prefer EXPO_PUBLIC_API_BASE_URL (full URL, no trailing slash), e.g.:
 *   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8000
 *
 * Fallback: EXPO_PUBLIC_IP_ADDRESS → http://<ip>:8000
 */
export function getApiBaseUrl(): string {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");
  if (base) return base;
  const ip = process.env.EXPO_PUBLIC_IP_ADDRESS;
  if (!ip) return "";
  return `http://${ip}:8000`;
}
