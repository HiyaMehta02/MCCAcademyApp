/** Shared date display helpers (academy prefers long month names). */

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const WEEKDAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** e.g. 21 September 1977 */
export function formatDobLong(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return "—";
  const d = typeof isoOrDate === "string" ? parseIsoDateLocal(isoOrDate) : isoOrDate;
  if (!d || Number.isNaN(d.getTime())) return String(isoOrDate);
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** e.g. 1 January 2026 Sunday — matches owner attendance report style */
export function formatAttendanceDayLabel(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? parseIsoDateLocal(isoOrDate) : isoOrDate;
  if (!d || Number.isNaN(d.getTime())) return String(isoOrDate);
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()} ${WEEKDAYS_LONG[d.getDay()]}`;
}

export function weekdayNameFromIso(isoDate: string): string {
  const d = parseIsoDateLocal(isoDate);
  if (!d || Number.isNaN(d.getTime())) return "";
  return WEEKDAYS_LONG[d.getDay()].toLowerCase();
}

/** Parse YYYY-MM-DD as local calendar date (avoid UTC shift). */
export function parseIsoDateLocal(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) {
    const fallback = new Date(iso);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
