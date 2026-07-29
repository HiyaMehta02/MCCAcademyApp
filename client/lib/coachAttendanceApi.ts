import { supabase } from "./supabase";
import {
  fetchCoachAttendanceForDate,
  fetchCoachBranchSessions,
  recordCoachAttendance,
} from "./coachAttendance";
import type {
  CoachAttendanceRecord,
  CoachAttendanceStatus,
  CoachBranchSession,
  RecordCoachAttendanceInput,
} from "./coachAttendance";

export type {
  CoachAttendanceRecord,
  CoachAttendanceStatus,
  CoachBranchSession,
  RecordCoachAttendanceInput,
};

export type CoachListItem = {
  coach_id: string;
  first_name: string;
  last_name: string;
  status: string;
  is_admin: boolean | null;
};

export type BranchOption = {
  branch_id: string;
  branch_name: string;
};

export {
  fetchCoachAttendanceForDate,
  fetchCoachBranchSessions,
  recordCoachAttendance,
};

export async function fetchCurrentCoachId(): Promise<string | null> {
  const { data, error } = await supabase.rpc("current_coach_id");
  if (error) throw error;
  return data ? String(data) : null;
}

export async function fetchActiveCoaches(): Promise<CoachListItem[]> {
  const { data, error } = await supabase
    .from("coaches")
    .select("coach_id, first_name, last_name, status, is_admin")
    .eq("status", "approved")
    .order("first_name");

  if (error) throw error;
  return (data ?? []) as CoachListItem[];
}

export async function fetchActiveBranches(): Promise<BranchOption[]> {
  const { data, error } = await supabase
    .from("branches")
    .select("branch_id, branch_name")
    .or("status.eq.active,status.is.null")
    .order("branch_name");

  if (error) throw error;
  return (data ?? []) as BranchOption[];
}

export async function upsertCoachBranchSession(input: {
  coachId: string;
  branchId: string;
  startTime: string;
  endTime: string;
  label?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("coach_branch_sessions").upsert(
    {
      coach_id: input.coachId,
      branch_id: input.branchId,
      start_time: normalizeTime(input.startTime),
      end_time: normalizeTime(input.endTime),
      label: input.label?.trim() || null,
      is_active: true,
    },
    { onConflict: "coach_id,branch_id,start_time,end_time" }
  );
  if (error) throw error;
}

export async function checkoutCoachAttendance(input: {
  coachAttendanceId: string;
  leftEarlyMinutes?: number | null;
  notes?: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from("coach_attendance")
    .update({
      checked_out_at: new Date().toISOString(),
      left_early_minutes: input.leftEarlyMinutes ?? null,
      notes: input.notes ?? null,
      status: input.leftEarlyMinutes && input.leftEarlyMinutes > 0 ? "partial" : "present",
    })
    .eq("coach_attendance_id", input.coachAttendanceId);

  if (error) throw error;
}

export async function fetchRecentCoachAttendance(
  coachId: string,
  limit = 20
): Promise<CoachAttendanceRecord[]> {
  const { data, error } = await supabase
    .from("coach_attendance")
    .select(
      `
      coach_attendance_id,
      coach_id,
      branch_id,
      attendance_date,
      session_start,
      session_end,
      checked_in_at,
      checked_out_at,
      left_early_minutes,
      status,
      notes,
      branches ( branch_name )
    `
    )
    .eq("coach_id", coachId)
    .order("attendance_date", { ascending: false })
    .order("session_start", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row,
    branches: Array.isArray(row.branches) ? row.branches[0] ?? null : row.branches,
  })) as CoachAttendanceRecord[];
}

/** Accept "17:00" or "5:00pm" → "17:00:00" for Postgres time */
export function normalizeTime(raw: string): string {
  const value = raw.trim().toLowerCase();
  const ampm = value.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (ampm) {
    let hour = Number(ampm[1]);
    const minute = Number(ampm[2]);
    const meridiem = ampm[3].toLowerCase();
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
  }

  const twentyFour = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (twentyFour) {
    const hour = Number(twentyFour[1]);
    const minute = Number(twentyFour[2]);
    const second = twentyFour[3] ? Number(twentyFour[3]) : 0;
    if (hour > 23 || minute > 59 || second > 59) {
      throw new Error(`Invalid time: ${raw}`);
    }
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
  }

  throw new Error(`Use time like 17:00 or 5:00pm (got ${raw})`);
}

export function formatSessionTime(time: string | null): string {
  if (!time) return "—";
  const m = /^(\d{2}):(\d{2})/.exec(time);
  if (!m) return time;
  let hour = Number(m[1]);
  const minute = m[2];
  const meridiem = hour >= 12 ? "pm" : "am";
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;
  return `${hour}:${minute}${meridiem}`;
}
