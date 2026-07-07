import { supabase } from "./supabase";

export type StudentGender = "boy" | "girl";
export type PaymentMethod = "cash" | "check" | "bank_transfer";

export type StudentProfile = {
  student_id: string;
  first_name: string;
  last_name: string;
  parent_phone: string | null;
  gender: StudentGender;
  is_sibling_discount_eligible: boolean;
  referral_discount_month: number | null;
  referral_discount_year: number | null;
  branch_id: string | null;
  branches: { branch_name: string } | null;
};

export type StudentEnrollment = {
  batch_id: string;
  batch_name: string;
  fee_plan_name: string | null;
};

export type InvoiceLineItem = {
  line_item_id: string;
  description: string;
  amount: number;
  line_type: string;
};

export type BillingSummary = {
  invoice_id: string;
  student_id: string;
  billing_year: number;
  billing_month: number;
  subtotal: number;
  discount_total: number;
  total_due: number;
  amount_paid: number;
  balance_due: number;
  due_date: string;
  status: string;
  line_items: InvoiceLineItem[];
};

export type PaymentRecord = {
  payment_id: string;
  invoice_id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string | null;
  transaction_id: string | null;
  notes: string | null;
  invoices: {
    billing_month: number;
    billing_year: number;
  } | null;
};

export type AttendanceRecord = {
  attendance_id: string;
  date: string;
  status: string;
  batches: { batch_name: string } | null;
};

export function currentBillingPeriod(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export async function fetchStudentProfile(studentId: string): Promise<StudentProfile | null> {
  const { data, error } = await supabase
    .from("students")
    .select(
      `
      student_id,
      first_name,
      last_name,
      parent_phone,
      gender,
      is_sibling_discount_eligible,
      referral_discount_month,
      referral_discount_year,
      branch_id,
      branches ( branch_name )
    `
    )
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    gender: (data.gender as StudentGender) ?? "boy",
    branches: Array.isArray(data.branches) ? data.branches[0] ?? null : data.branches,
  } as StudentProfile;
}

export async function fetchStudentEnrollments(studentId: string): Promise<StudentEnrollment[]> {
  const { data, error } = await supabase
    .from("batch_members")
    .select(
      `
      batches (
        batch_id,
        batch_name,
        fee_plan_templates ( display_name )
      )
    `
    )
    .eq("student_id", studentId);

  if (error) throw error;

  return (data ?? []).map((row: any) => {
    const batch = row.batches;
    const plan = batch?.fee_plan_templates;
    const planName = Array.isArray(plan) ? plan[0]?.display_name : plan?.display_name;
    return {
      batch_id: batch?.batch_id ?? "",
      batch_name: batch?.batch_name ?? "Unknown batch",
      fee_plan_name: planName ?? null,
    };
  });
}

export async function refreshStudentBilling(
  studentId: string,
  year: number,
  month: number
): Promise<BillingSummary> {
  const { data, error } = await supabase.rpc("refresh_student_billing", {
    p_student_id: studentId,
    p_year: year,
    p_month: month,
  });

  if (error) throw error;
  return data as BillingSummary;
}

export async function fetchStudentPayments(studentId: string): Promise<PaymentRecord[]> {
  const { data, error } = await supabase
    .from("payments")
    .select(
      `
      payment_id,
      invoice_id,
      amount_paid,
      payment_date,
      payment_method,
      transaction_id,
      notes,
      invoices ( billing_month, billing_year )
    `
    )
    .eq("student_id", studentId)
    .order("payment_date", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row,
    invoices: Array.isArray(row.invoices) ? row.invoices[0] ?? null : row.invoices,
  }));
}

export async function fetchStudentAttendance(
  studentId: string,
  limit?: number
): Promise<AttendanceRecord[]> {
  let query = supabase
    .from("attendance")
    .select(
      `
      attendance_id,
      date,
      status,
      batches ( batch_name )
    `
    )
    .eq("student_id", studentId)
    .order("date", { ascending: false });

  if (limit != null && limit > 0) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row,
    batches: Array.isArray(row.batches) ? row.batches[0] ?? null : row.batches,
  }));
}

export type RecordPaymentInput = {
  studentId: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  paymentDate: string;
  transactionId?: string;
  notes?: string;
};

export async function recordPayment(input: RecordPaymentInput): Promise<void> {
  const { error: insertError } = await supabase.from("payments").insert({
    student_id: input.studentId,
    invoice_id: input.invoiceId,
    amount_paid: input.amount,
    payment_method: input.method,
    payment_date: input.paymentDate,
    transaction_id: input.transactionId || null,
    notes: input.notes || null,
  });

  if (insertError) throw insertError;
}

export type UpdateStudentFlagsInput = {
  gender?: StudentGender;
  is_sibling_discount_eligible?: boolean;
};

export async function updateStudentFlags(
  studentId: string,
  updates: UpdateStudentFlagsInput
): Promise<void> {
  const { error } = await supabase.from("students").update(updates).eq("student_id", studentId);
  if (error) throw error;
}

export type BranchOption = {
  branch_id: string;
  branch_name: string;
};

export type BatchOption = {
  batch_id: string;
  batch_name: string;
  fee_plan_name: string | null;
};

export async function fetchBranches(): Promise<BranchOption[]> {
  const { data, error } = await supabase
    .from("branches")
    .select("branch_id, branch_name")
    .or("status.eq.active,status.is.null")
    .order("branch_name");

  if (error) throw error;
  return (data ?? []) as BranchOption[];
}

export async function fetchBatchBranch(batchId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("batches")
    .select("branch_id")
    .eq("batch_id", batchId)
    .maybeSingle();

  if (error) throw error;
  return data?.branch_id ?? null;
}

export async function fetchBatchesForBranch(
  branchId: string,
  excludeBatchIds: string[] = []
): Promise<BatchOption[]> {
  const { data, error } = await supabase
    .from("batches")
    .select(
      `
      batch_id,
      batch_name,
      fee_plan_templates ( display_name )
    `
    )
    .eq("branch_id", branchId)
    .or("status.eq.active,status.is.null")
    .order("batch_name");

  if (error) throw error;

  return (data ?? [])
    .filter((row: any) => !excludeBatchIds.includes(row.batch_id))
    .map((row: any) => {
      const plan = row.fee_plan_templates;
      const planName = Array.isArray(plan) ? plan[0]?.display_name : plan?.display_name;
      return {
        batch_id: row.batch_id,
        batch_name: row.batch_name,
        fee_plan_name: planName ?? null,
      };
    });
}

export type CreateStudentInput = {
  first_name: string;
  last_name: string;
  gender: StudentGender;
  branch_id: string;
  parent_phone?: string;
  dob?: string;
  is_sibling_discount_eligible?: boolean;
  referral_discount_month?: number;
  referral_discount_year?: number;
};

export async function createStudent(input: CreateStudentInput): Promise<string> {
  const { data, error } = await supabase
    .from("students")
    .insert({
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      gender: input.gender,
      branch_id: input.branch_id,
      parent_phone: input.parent_phone?.trim() || null,
      dob: input.dob || null,
      is_sibling_discount_eligible: input.is_sibling_discount_eligible ?? false,
      referral_discount_month: input.referral_discount_month ?? null,
      referral_discount_year: input.referral_discount_year ?? null,
      status: "active",
    })
    .select("student_id")
    .single();

  if (error) throw error;
  return data.student_id as string;
}

export async function enrollStudentInBatch(studentId: string, batchId: string): Promise<void> {
  const { error } = await supabase.from("batch_members").insert({
    student_id: studentId,
    batch_id: batchId,
  });

  if (error) throw error;
}

export async function removeStudentFromBatch(studentId: string, batchId: string): Promise<void> {
  const { error } = await supabase
    .from("batch_members")
    .delete()
    .eq("student_id", studentId)
    .eq("batch_id", batchId);

  if (error) throw error;
}

export const MUSCAT_BRANCH_ID = "49908128-0724-4193-ab1c-4c657ad64f9e";
export const AZAIBA_BRANCH_ID = "86d47a79-22d7-4155-bba4-541362a2f468";

export const WEEKDAY_OPTIONS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const FEE_PROGRAM_SCHEDULES: Record<string, string> = {
  weekday_batch: "Sat, Mon, Wed · 7:00–8:45pm",
  weekend_batch: "Thu 7–8:45pm; Fri & Sat 5–6:45pm",
  special_batch: "Sun, Tue, Fri · 7:00–8:45pm · LIMITED KIDS",
  weekday_evening: "Mon, Wed, Thu · 5:00–6:45pm",
  parents_batch: "Sun, Tue, Fri · 7:00–8:45pm · boys only",
  azaiba_3day: "3 days/week · 7:00–8:45pm",
  azaiba_4day: "4 days/week · 7:00–8:45pm",
};

export type FeePlanOption = {
  fee_plan_id: string;
  plan_code: string;
  display_name: string;
  boys_monthly_fee: number;
  girls_monthly_fee: number | null;
};

export type CustomDayTier = {
  tier_id: string;
  days_per_week: number;
  boys_monthly_fee: number;
  girls_monthly_fee: number;
  display_label: string;
};

export type StudentFeePlanEnrollment = {
  enrollment_id: string;
  fee_plan_id: string;
  fee_plan_templates: {
    display_name: string;
    plan_code: string;
    boys_monthly_fee: number;
    girls_monthly_fee: number | null;
  } | null;
};

export type StudentCustomPlan = {
  custom_plan_id: string;
  selected_days: string[];
  days_per_week: number;
  boys_monthly_fee: number;
  girls_monthly_fee: number;
  plan_label: string | null;
};

export function allowedCustomDayCounts(branchId: string): number[] {
  if (branchId === AZAIBA_BRANCH_ID) return [3, 4];
  if (branchId === MUSCAT_BRANCH_ID) return [4, 5, 6];
  return [3, 4, 5, 6];
}

export async function fetchFeePlansForBranch(
  branchId: string,
  excludePlanIds: string[] = []
): Promise<FeePlanOption[]> {
  const { data, error } = await supabase
    .from("fee_plan_templates")
    .select("fee_plan_id, plan_code, display_name, boys_monthly_fee, girls_monthly_fee")
    .eq("branch_id", branchId)
    .eq("is_active", true)
    .order("display_name");

  if (error) throw error;

  return (data ?? [])
    .filter((row) => !excludePlanIds.includes(row.fee_plan_id))
    .map((row) => ({
      ...row,
      boys_monthly_fee: Number(row.boys_monthly_fee),
      girls_monthly_fee: row.girls_monthly_fee != null ? Number(row.girls_monthly_fee) : null,
    })) as FeePlanOption[];
}

export async function fetchCustomDayTiers(branchId: string): Promise<CustomDayTier[]> {
  const { data, error } = await supabase
    .from("custom_day_fee_tiers")
    .select("tier_id, days_per_week, boys_monthly_fee, girls_monthly_fee, display_label")
    .eq("branch_id", branchId)
    .order("days_per_week");

  if (error) throw error;

  return (data ?? []).map((row) => ({
    ...row,
    boys_monthly_fee: Number(row.boys_monthly_fee),
    girls_monthly_fee: Number(row.girls_monthly_fee),
  })) as CustomDayTier[];
}

export async function fetchStudentFeePlanEnrollments(
  studentId: string
): Promise<StudentFeePlanEnrollment[]> {
  const { data, error } = await supabase
    .from("student_fee_plan_enrollments")
    .select(
      `
      enrollment_id,
      fee_plan_id,
      fee_plan_templates (
        display_name,
        plan_code,
        boys_monthly_fee,
        girls_monthly_fee
      )
    `
    )
    .eq("student_id", studentId);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row,
    fee_plan_templates: Array.isArray(row.fee_plan_templates)
      ? row.fee_plan_templates[0] ?? null
      : row.fee_plan_templates,
  }));
}

export async function fetchStudentCustomPlan(
  studentId: string
): Promise<StudentCustomPlan | null> {
  const { data, error } = await supabase
    .from("student_custom_plans")
    .select("custom_plan_id, selected_days, days_per_week, boys_monthly_fee, girls_monthly_fee, plan_label")
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    boys_monthly_fee: Number(data.boys_monthly_fee),
    girls_monthly_fee: Number(data.girls_monthly_fee),
  } as StudentCustomPlan;
}

export async function enrollStudentInFeePlan(studentId: string, feePlanId: string): Promise<void> {
  const { error } = await supabase.from("student_fee_plan_enrollments").insert({
    student_id: studentId,
    fee_plan_id: feePlanId,
  });
  if (error) throw error;
}

export async function removeStudentFromFeePlan(studentId: string, feePlanId: string): Promise<void> {
  const { error } = await supabase
    .from("student_fee_plan_enrollments")
    .delete()
    .eq("student_id", studentId)
    .eq("fee_plan_id", feePlanId);
  if (error) throw error;
}

export type UpsertCustomPlanInput = {
  studentId: string;
  branchId: string;
  selectedDays: string[];
  daysPerWeek: number;
  boysMonthlyFee: number;
  girlsMonthlyFee: number;
  planLabel: string;
};

export async function upsertStudentCustomPlan(input: UpsertCustomPlanInput): Promise<void> {
  const { error } = await supabase.from("student_custom_plans").upsert(
    {
      student_id: input.studentId,
      branch_id: input.branchId,
      selected_days: input.selectedDays,
      days_per_week: input.daysPerWeek,
      boys_monthly_fee: input.boysMonthlyFee,
      girls_monthly_fee: input.girlsMonthlyFee,
      plan_label: input.planLabel,
    },
    { onConflict: "student_id" }
  );
  if (error) throw error;
}

export async function removeStudentCustomPlan(studentId: string): Promise<void> {
  const { error } = await supabase.from("student_custom_plans").delete().eq("student_id", studentId);
  if (error) throw error;
}
