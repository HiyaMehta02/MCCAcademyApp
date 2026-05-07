import { supabase } from "./supabase";

/** Matches API shape used by Batch / attendance / enrollment screens */
export type BatchStudentRow = {
  student_id: string;
  students: {
    first_name: string;
    last_name: string;
    status: string;
  };
};

/**
 * Students in a batch via `batch_members` → `students`.
 */
export async function fetchStudentsForBatch(batchId: string): Promise<BatchStudentRow[]> {
  if (!batchId) return [];

  const { data, error } = await supabase
    .from("batch_members")
    .select(
      `
      student_id,
      students (
        first_name,
        last_name,
        status
      )
    `
    )
    .eq("batch_id", batchId);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    student_id: row.student_id,
    students: {
      first_name: row.students?.first_name ?? "",
      last_name: row.students?.last_name ?? "",
      status: row.students?.status ?? "",
    },
  }));
}
