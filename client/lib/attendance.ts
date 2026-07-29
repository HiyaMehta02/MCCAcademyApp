import { supabase } from "./supabase";
import { weekdayNameFromIso } from "./dateFormat";

export type AttendanceStatus = "Present" | "Absent";

export type BatchAttendanceRow = {
  student_id: string;
  status: AttendanceStatus;
};

export type SetAttendanceOptions = {
  isOffSchedule?: boolean;
  isCrossBranch?: boolean;
  notes?: string | null;
};

/** Local calendar date as YYYY-MM-DD */
export function todayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function fetchBatchAttendanceForDate(
  batchId: string,
  date: string
): Promise<Record<string, AttendanceStatus>> {
  const { data, error } = await supabase
    .from("attendance")
    .select("student_id, status")
    .eq("batch_id", batchId)
    .eq("date", date);

  if (error) throw error;

  const map: Record<string, AttendanceStatus> = {};
  for (const row of data ?? []) {
    const status = row.status as string;
    if (status === "Present" || status === "Absent") {
      map[row.student_id] = status;
    }
  }
  return map;
}

export async function fetchStudentExpectedWeekdays(studentId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc("student_expected_weekdays", {
    p_student_id: studentId,
  });
  if (error) throw error;
  if (!Array.isArray(data)) return [];
  return data.map((d) => String(d).trim().toLowerCase()).filter(Boolean);
}

/** Returns true when the date's weekday is outside the student's expected schedule. */
export async function isAttendanceOffSchedule(
  studentId: string,
  dateIso: string
): Promise<boolean> {
  const expected = await fetchStudentExpectedWeekdays(studentId);
  if (expected.length === 0) return false;
  const weekday = weekdayNameFromIso(dateIso);
  if (!weekday) return false;
  return !expected.includes(weekday);
}

export async function isAttendanceCrossBranch(
  studentId: string,
  batchId: string
): Promise<boolean> {
  const [{ data: student, error: studentErr }, { data: batch, error: batchErr }] =
    await Promise.all([
      supabase.from("students").select("branch_id").eq("student_id", studentId).maybeSingle(),
      supabase.from("batches").select("branch_id").eq("batch_id", batchId).maybeSingle(),
    ]);

  if (studentErr) throw studentErr;
  if (batchErr) throw batchErr;

  const home = student?.branch_id ?? null;
  const sessionBranch = batch?.branch_id ?? null;
  if (!home || !sessionBranch) return false;
  return home !== sessionBranch;
}

export async function setStudentAttendance(
  studentId: string,
  batchId: string,
  date: string,
  status: AttendanceStatus,
  options: SetAttendanceOptions = {}
): Promise<void> {
  const { error } = await supabase.from("attendance").upsert(
    {
      student_id: studentId,
      batch_id: batchId,
      date,
      status,
      is_off_schedule: options.isOffSchedule ?? false,
      is_cross_branch: options.isCrossBranch ?? false,
      notes: options.notes ?? null,
    },
    { onConflict: "student_id,batch_id,date" }
  );

  if (error) throw error;
}
