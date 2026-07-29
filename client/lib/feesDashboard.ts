import { supabase } from "./supabase";

export type FeeUrgency = "overdue" | "due_soon" | "pending";

export type PendingFeeRow = {
  invoice_id: string;
  student_id: string;
  student_first_name: string;
  student_last_name: string;
  branch_id: string | null;
  branch_name: string | null;
  batch_name: string | null;
  billing_year: number;
  billing_month: number;
  total_due: number;
  amount_paid: number;
  balance_due: number;
  due_date: string | null;
  status: string;
  urgency: FeeUrgency;
};

export const DUE_SOON_DAYS = 3;
export const DEFAULT_FEE_REMINDER_DAYS = [15, 25];

function parseFeeRow(raw: unknown): PendingFeeRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const urgency = row.urgency;
  if (urgency !== "overdue" && urgency !== "due_soon" && urgency !== "pending") {
    return null;
  }

  return {
    invoice_id: String(row.invoice_id ?? ""),
    student_id: String(row.student_id ?? ""),
    student_first_name: String(row.student_first_name ?? ""),
    student_last_name: String(row.student_last_name ?? ""),
    branch_id: row.branch_id ? String(row.branch_id) : null,
    branch_name: row.branch_name ? String(row.branch_name) : null,
    batch_name: row.batch_name ? String(row.batch_name) : null,
    billing_year: Number(row.billing_year ?? 0),
    billing_month: Number(row.billing_month ?? 0),
    total_due: Number(row.total_due ?? 0),
    amount_paid: Number(row.amount_paid ?? 0),
    balance_due: Number(row.balance_due ?? 0),
    due_date: row.due_date ? String(row.due_date) : null,
    status: String(row.status ?? ""),
    urgency,
  };
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function classifyUrgency(dueDate: string | null, asOf: string): FeeUrgency {
  if (!dueDate) return "pending";
  const due = new Date(`${dueDate}T12:00:00`);
  const asOfDate = new Date(`${asOf}T12:00:00`);
  if (Number.isNaN(due.getTime()) || Number.isNaN(asOfDate.getTime())) return "pending";

  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((due.getTime() - asOfDate.getTime()) / msPerDay);
  if (diffDays < 0) return "overdue";
  if (diffDays <= DUE_SOON_DAYS) return "due_soon";
  return "pending";
}

function urgencyRank(urgency: FeeUrgency): number {
  if (urgency === "overdue") return 0;
  if (urgency === "due_soon") return 1;
  return 2;
}

function sortFeeRows(rows: PendingFeeRow[]): PendingFeeRow[] {
  return [...rows].sort((a, b) => {
    const rankDiff = urgencyRank(a.urgency) - urgencyRank(b.urgency);
    if (rankDiff !== 0) return rankDiff;
    const dueA = a.due_date ?? "9999-12-31";
    const dueB = b.due_date ?? "9999-12-31";
    if (dueA !== dueB) return dueA.localeCompare(dueB);
    const nameA = `${a.student_last_name} ${a.student_first_name}`.toLowerCase();
    const nameB = `${b.student_last_name} ${b.student_first_name}`.toLowerCase();
    return nameA.localeCompare(nameB);
  });
}

async function fetchPendingFeesViaRpc(branchId?: string | null): Promise<PendingFeeRow[]> {
  const { data, error } = await supabase.rpc("list_pending_fees", {
    p_branch_id: branchId ?? null,
    p_as_of_date: todayIsoDate(),
    p_due_soon_days: DUE_SOON_DAYS,
  });

  if (error) throw error;
  const rows = (data ?? [])
    .map((row: unknown) => parseFeeRow(row))
    .filter((row: PendingFeeRow | null): row is PendingFeeRow => row !== null && row.student_id.length > 0);
  return sortFeeRows(rows);
}

/** Client-side fallback when the RPC migration has not been applied yet. */
async function fetchPendingFeesViaQuery(branchId?: string | null): Promise<PendingFeeRow[]> {
  const asOf = todayIsoDate();

  let query = supabase
    .from("invoices")
    .select(
      `
      invoice_id,
      billing_year,
      billing_month,
      total_due,
      amount_due,
      due_date,
      status,
      students (
        student_id,
        first_name,
        last_name,
        branch_id,
        branches ( branch_name ),
        batch_members (
          batches ( batch_name )
        )
      )
    `
    )
    .in("status", ["open", "partial", "unpaid"]);

  const { data: invoices, error } = await query;
  if (error) throw error;

  const invoiceIds = (invoices ?? []).map((row: any) => row.invoice_id).filter(Boolean);
  const paidByInvoice = new Map<string, number>();

  if (invoiceIds.length > 0) {
    const { data: payments, error: payError } = await supabase
      .from("payments")
      .select("invoice_id, amount_paid")
      .in("invoice_id", invoiceIds);

    if (payError) throw payError;

    for (const payment of payments ?? []) {
      const id = payment.invoice_id as string;
      const prev = paidByInvoice.get(id) ?? 0;
      paidByInvoice.set(id, prev + Number(payment.amount_paid ?? 0));
    }
  }

  const rows: PendingFeeRow[] = [];

  for (const invoice of invoices ?? []) {
    const studentRaw = invoice.students;
    const student = Array.isArray(studentRaw) ? studentRaw[0] : studentRaw;
    if (!student) continue;

    if (branchId && student.branch_id !== branchId) continue;

    const branchRaw = student.branches;
    const branch = Array.isArray(branchRaw) ? branchRaw[0] : branchRaw;

    const members = Array.isArray(student.batch_members) ? student.batch_members : [];
    let batchName: string | null = null;
    for (const member of members) {
      const batchRaw = member?.batches;
      const batch = Array.isArray(batchRaw) ? batchRaw[0] : batchRaw;
      if (batch?.batch_name) {
        batchName = batch.batch_name;
        break;
      }
    }

    const totalDue = Number(invoice.total_due ?? invoice.amount_due ?? 0);
    const amountPaid = paidByInvoice.get(invoice.invoice_id) ?? 0;
    const balanceDue = Math.max(totalDue - amountPaid, 0);
    if (balanceDue <= 0) continue;

    const dueDate = invoice.due_date ? String(invoice.due_date) : null;

    rows.push({
      invoice_id: invoice.invoice_id,
      student_id: student.student_id,
      student_first_name: student.first_name ?? "",
      student_last_name: student.last_name ?? "",
      branch_id: student.branch_id ?? null,
      branch_name: branch?.branch_name ?? null,
      batch_name: batchName,
      billing_year: Number(invoice.billing_year ?? 0),
      billing_month: Number(invoice.billing_month ?? 0),
      total_due: totalDue,
      amount_paid: amountPaid,
      balance_due: balanceDue,
      due_date: dueDate,
      status: invoice.status ?? "",
      urgency: classifyUrgency(dueDate, asOf),
    });
  }

  return sortFeeRows(rows);
}

export async function fetchPendingFees(branchId?: string | null): Promise<PendingFeeRow[]> {
  try {
    return await fetchPendingFeesViaRpc(branchId);
  } catch (rpcError: unknown) {
    const message = rpcError instanceof Error ? rpcError.message : String(rpcError);
    if (
      message.includes("list_pending_fees") ||
      message.includes("Could not find the function") ||
      message.includes("schema cache")
    ) {
      return fetchPendingFeesViaQuery(branchId);
    }
    throw rpcError;
  }
}

export async function fetchIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_current_user_admin");
  if (error) throw error;
  return Boolean(data);
}

export function formatOmr(amount: number): string {
  return `${Number(amount).toFixed(2)} OMR`;
}

export function formatDueDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

export function billingPeriodLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString("default", {
    month: "short",
    year: "numeric",
  });
}

export function summarizeFees(rows: PendingFeeRow[]) {
  return rows.reduce(
    (acc, row) => {
      acc.totalBalance += row.balance_due;
      if (row.urgency === "overdue") acc.overdueCount += 1;
      else if (row.urgency === "due_soon") acc.dueSoonCount += 1;
      else acc.pendingCount += 1;
      return acc;
    },
    { overdueCount: 0, dueSoonCount: 0, pendingCount: 0, totalBalance: 0 }
  );
}

/** Reminder days from fee_policies (defaults to 15th & 25th). */
export async function fetchFeeReminderDays(): Promise<number[]> {
  const { data, error } = await supabase
    .from("fee_policies")
    .select("reminder_days_of_month")
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  const raw = data?.reminder_days_of_month;
  if (!Array.isArray(raw) || raw.length === 0) {
    return [...DEFAULT_FEE_REMINDER_DAYS];
  }

  const days = raw
    .map((d) => Number(d))
    .filter((d) => Number.isInteger(d) && d >= 1 && d <= 31);
  return days.length > 0 ? days : [...DEFAULT_FEE_REMINDER_DAYS];
}

export function isFeeReminderDayToday(
  reminderDays: number[],
  asOf: Date = new Date()
): boolean {
  return reminderDays.includes(asOf.getDate());
}
