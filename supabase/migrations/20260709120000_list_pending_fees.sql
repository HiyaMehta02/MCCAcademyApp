-- Phase B: Academy-wide pending fees dashboard (MVP early deployment).

CREATE INDEX IF NOT EXISTS invoices_status_due_date_idx
  ON public.invoices (status, due_date);

CREATE INDEX IF NOT EXISTS invoices_billing_period_status_idx
  ON public.invoices (billing_year, billing_month, status);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rw_approved_staff_invoices ON public.invoices;
CREATE POLICY rw_approved_staff_invoices ON public.invoices
  FOR ALL TO authenticated
  USING (public.has_coach_access() OR public.is_current_user_admin())
  WITH CHECK (public.has_coach_access() OR public.is_current_user_admin());

CREATE OR REPLACE FUNCTION public.list_pending_fees(
  p_branch_id uuid DEFAULT NULL,
  p_as_of_date date DEFAULT CURRENT_DATE,
  p_due_soon_days integer DEFAULT 3
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_coach_access() OR public.is_current_user_admin()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH paid AS (
    SELECT p.invoice_id, COALESCE(SUM(p.amount_paid), 0)::numeric AS amount_paid
    FROM public.payments p
    GROUP BY p.invoice_id
  ),
  fee_rows AS (
    SELECT
      i.invoice_id,
      s.student_id,
      s.first_name AS student_first_name,
      s.last_name AS student_last_name,
      s.branch_id,
      b.branch_name,
      (
        SELECT bat.batch_name
        FROM public.batch_members bm
        JOIN public.batches bat ON bat.batch_id = bm.batch_id
        WHERE bm.student_id = s.student_id
        ORDER BY bat.batch_name
        LIMIT 1
      ) AS batch_name,
      i.billing_year,
      i.billing_month,
      COALESCE(i.total_due, i.amount_due, 0)::numeric AS total_due,
      COALESCE(paid.amount_paid, 0)::numeric AS amount_paid,
      GREATEST(
        COALESCE(i.total_due, i.amount_due, 0) - COALESCE(paid.amount_paid, 0),
        0
      )::numeric AS balance_due,
      i.due_date,
      i.status,
      CASE
        WHEN i.due_date IS NOT NULL AND i.due_date < p_as_of_date THEN 'overdue'
        WHEN i.due_date IS NOT NULL AND i.due_date <= p_as_of_date + p_due_soon_days THEN 'due_soon'
        ELSE 'pending'
      END AS urgency,
      CASE
        WHEN i.due_date IS NOT NULL AND i.due_date < p_as_of_date THEN 0
        WHEN i.due_date IS NOT NULL AND i.due_date <= p_as_of_date + p_due_soon_days THEN 1
        ELSE 2
      END AS urgency_rank
    FROM public.invoices i
    JOIN public.students s ON s.student_id = i.student_id
    LEFT JOIN public.branches b ON b.branch_id = s.branch_id
    LEFT JOIN paid ON paid.invoice_id = i.invoice_id
    WHERE i.status IN ('open', 'partial', 'unpaid')
      AND (p_branch_id IS NULL OR s.branch_id = p_branch_id)
      AND GREATEST(
        COALESCE(i.total_due, i.amount_due, 0) - COALESCE(paid.amount_paid, 0),
        0
      ) > 0
  )
  SELECT jsonb_build_object(
    'invoice_id', fr.invoice_id,
    'student_id', fr.student_id,
    'student_first_name', fr.student_first_name,
    'student_last_name', fr.student_last_name,
    'branch_id', fr.branch_id,
    'branch_name', fr.branch_name,
    'batch_name', fr.batch_name,
    'billing_year', fr.billing_year,
    'billing_month', fr.billing_month,
    'total_due', fr.total_due,
    'amount_paid', fr.amount_paid,
    'balance_due', fr.balance_due,
    'due_date', fr.due_date,
    'status', fr.status,
    'urgency', fr.urgency
  )
  FROM fee_rows fr
  ORDER BY
    fr.urgency_rank,
    fr.due_date NULLS LAST,
    fr.student_last_name,
    fr.student_first_name;
END;
$$;

REVOKE ALL ON FUNCTION public.list_pending_fees(uuid, date, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_pending_fees(uuid, date, integer) TO authenticated;
