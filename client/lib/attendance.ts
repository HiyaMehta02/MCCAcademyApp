import { supabase } from "./supabase";

export type AttendanceStatus = "Present" | "Absent";

export type BatchAttendanceRow = {
  student_id: string;
  status: AttendanceStatus;
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

export async function setStudentAttendance(
  studentId: string,
  batchId: string,
  date: string,
  status: AttendanceStatus
): Promise<void> {
  const { error } = await supabase.from("attendance").upsert(
    {
      student_id: studentId,
      batch_id: batchId,
      date,
      status,
    },
    { onConflict: "student_id,batch_id,date" }
  );

  if (error) throw error;
}
