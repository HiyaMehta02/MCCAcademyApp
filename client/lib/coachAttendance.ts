import { supabase } from "./supabase";

export type CoachAttendanceStatus = "present" | "absent" | "partial";

export type CoachAttendanceRecord = {
  coach_attendance_id: string;
  coach_id: string;
  branch_id: string;
  attendance_date: string;
  session_start: string | null;
  session_end: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  left_early_minutes: number | null;
  status: CoachAttendanceStatus;
  notes: string | null;
  branches?: { branch_name: string } | null;
};

export type CoachBranchSession = {
  session_id: string;
  coach_id: string;
  branch_id: string;
  label: string | null;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

export type RecordCoachAttendanceInput = {
  coachId: string;
  branchId: string;
  attendanceDate: string;
  sessionStart?: string | null;
  sessionEnd?: string | null;
  status?: CoachAttendanceStatus;
  leftEarlyMinutes?: number | null;
  notes?: string | null;
  recordedBy?: string | null;
};

export async function fetchCoachBranchSessions(
  coachId: string,
  branchId?: string
): Promise<CoachBranchSession[]> {
  let query = supabase
    .from("coach_branch_sessions")
    .select("session_id, coach_id, branch_id, label, start_time, end_time, is_active")
    .eq("coach_id", coachId)
    .eq("is_active", true)
    .order("start_time");

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CoachBranchSession[];
}

export async function fetchCoachAttendanceForDate(
  coachId: string,
  attendanceDate: string,
  branchId?: string
): Promise<CoachAttendanceRecord[]> {
  let query = supabase
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
    .eq("attendance_date", attendanceDate);

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row,
    branches: Array.isArray(row.branches) ? row.branches[0] ?? null : row.branches,
  })) as CoachAttendanceRecord[];
}

export async function recordCoachAttendance(
  input: RecordCoachAttendanceInput
): Promise<void> {
  const { error } = await supabase.from("coach_attendance").upsert(
    {
      coach_id: input.coachId,
      branch_id: input.branchId,
      attendance_date: input.attendanceDate,
      session_start: input.sessionStart ?? null,
      session_end: input.sessionEnd ?? null,
      status: input.status ?? "present",
      left_early_minutes: input.leftEarlyMinutes ?? null,
      notes: input.notes ?? null,
      recorded_by: input.recordedBy ?? null,
      checked_in_at: new Date().toISOString(),
    },
    { onConflict: "coach_id,branch_id,attendance_date,session_start" }
  );

  if (error) throw error;
}
