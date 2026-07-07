-- Feature 3: Student fees foundation — fee plans, billing RPC, line items, payments.

-- ---------------------------------------------------------------------------
-- Fee plan templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fee_plan_templates (
  fee_plan_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code text NOT NULL UNIQUE,
  branch_id uuid REFERENCES public.branches(branch_id),
  display_name text NOT NULL,
  boys_monthly_fee numeric(10, 2) NOT NULL,
  girls_monthly_fee numeric(10, 2),
  registration_fee numeric(10, 2) NOT NULL DEFAULT 10,
  dress_fee numeric(10, 2) NOT NULL DEFAULT 10,
  days_per_week integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.fee_plan_templates IS 'Batch fee tiers (Weekday, Weekend, Azaiba 3-day, etc.).';

ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS fee_plan_id uuid REFERENCES public.fee_plan_templates(fee_plan_id);

-- ---------------------------------------------------------------------------
-- Students: gender + discount flags
-- ---------------------------------------------------------------------------
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'boy',
  ADD COLUMN IF NOT EXISTS is_sibling_discount_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_discount_month integer,
  ADD COLUMN IF NOT EXISTS referral_discount_year integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_gender_check'
  ) THEN
    ALTER TABLE public.students
      ADD CONSTRAINT students_gender_check CHECK (gender IN ('boy', 'girl'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Global fee policies (singleton)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fee_policies (
  policy_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  due_day_of_month integer NOT NULL DEFAULT 7 CHECK (due_day_of_month BETWEEN 1 AND 28),
  sibling_discount_omr numeric(10, 2) NOT NULL DEFAULT 5,
  referral_discount_omr numeric(10, 2) NOT NULL DEFAULT 5,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.fee_policies (due_day_of_month, sibling_discount_omr, referral_discount_omr)
SELECT 7, 5, 5
WHERE NOT EXISTS (SELECT 1 FROM public.fee_policies LIMIT 1);

-- ---------------------------------------------------------------------------
-- Invoice extensions + line items
-- ---------------------------------------------------------------------------
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS subtotal numeric(10, 2),
  ADD COLUMN IF NOT EXISTS discount_total numeric(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_due numeric(10, 2),
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS generated_at timestamptz DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS invoices_student_billing_period_unique
  ON public.invoices (student_id, billing_year, billing_month);

CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  line_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(invoice_id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric(10, 2) NOT NULL,
  line_type text NOT NULL CHECK (
    line_type IN (
      'monthly_batch', 'registration', 'dress',
      'sibling_discount', 'referral_discount', 'one_to_one', 'adjustment'
    )
  ),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoice_line_items_invoice_id_idx
  ON public.invoice_line_items (invoice_id);

-- ---------------------------------------------------------------------------
-- One-time charge ledger
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_one_time_charge_ledger (
  ledger_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  charge_type text NOT NULL CHECK (charge_type IN ('registration', 'dress')),
  charged_on date NOT NULL DEFAULT CURRENT_DATE,
  invoice_id uuid REFERENCES public.invoices(invoice_id),
  UNIQUE (student_id, charge_type)
);

-- ---------------------------------------------------------------------------
-- Payments extensions
-- ---------------------------------------------------------------------------
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(student_id),
  ADD COLUMN IF NOT EXISTS notes text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_method_check'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_method_check
      CHECK (payment_method IS NULL OR payment_method IN ('cash', 'check', 'bank_transfer'));
  END IF;
END $$;

UPDATE public.payments p
SET student_id = i.student_id
FROM public.invoices i
WHERE p.student_id IS NULL AND p.invoice_id = i.invoice_id;

-- ---------------------------------------------------------------------------
-- Seed fee plan templates (Muscat + Azaiba branch IDs from project data)
-- ---------------------------------------------------------------------------
INSERT INTO public.fee_plan_templates (
  plan_code, branch_id, display_name, boys_monthly_fee, girls_monthly_fee,
  registration_fee, dress_fee, days_per_week
) VALUES
  ('weekday_batch', '49908128-0724-4193-ab1c-4c657ad64f9e', 'Weekday Batch', 25, 15, 10, 10, 3),
  ('weekend_batch', '49908128-0724-4193-ab1c-4c657ad64f9e', 'Weekend Batch', 25, 15, 10, 10, NULL),
  ('special_batch', '49908128-0724-4193-ab1c-4c657ad64f9e', 'Special Batch', 30, 20, 10, 10, 3),
  ('weekday_evening', '49908128-0724-4193-ab1c-4c657ad64f9e', 'Weekdays Evening Batch', 25, 15, 10, 10, 3),
  ('parents_batch', '49908128-0724-4193-ab1c-4c657ad64f9e', 'Only Parents Batch', 25, NULL, 10, 10, 3),
  ('azaiba_3day', '86d47a79-22d7-4155-bba4-541362a2f468', 'Azaiba 3 Days/Week', 25, 15, 10, 10, 3),
  ('azaiba_4day', '86d47a79-22d7-4155-bba4-541362a2f468', 'Azaiba 4 Days/Week', 30, 20, 10, 10, 4)
ON CONFLICT (plan_code) DO NOTHING;

-- Default fee plan per branch on existing batches
UPDATE public.batches b
SET fee_plan_id = fp.fee_plan_id
FROM public.fee_plan_templates fp
WHERE b.fee_plan_id IS NULL
  AND b.branch_id = fp.branch_id
  AND fp.plan_code = CASE
    WHEN b.branch_id = '86d47a79-22d7-4155-bba4-541362a2f468' THEN 'azaiba_3day'
    ELSE 'weekday_batch'
  END;

-- ---------------------------------------------------------------------------
-- Billing RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_student_billing(
  p_student_id uuid,
  p_year integer,
  p_month integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student record;
  v_policy record;
  v_invoice_id uuid;
  v_subtotal numeric(10, 2) := 0;
  v_discount_total numeric(10, 2) := 0;
  v_total_due numeric(10, 2) := 0;
  v_due_date date;
  v_paid numeric(10, 2) := 0;
  v_status text := 'open';
  v_enrollment record;
  v_monthly_fee numeric(10, 2);
  v_reg_fee numeric(10, 2);
  v_dress_fee numeric(10, 2);
  v_line_items jsonb := '[]'::jsonb;
BEGIN
  IF NOT (public.has_coach_access() OR public.is_current_user_admin()) THEN
    RAISE EXCEPTION 'Coach access required';
  END IF;

  SELECT * INTO v_student FROM public.students WHERE student_id = p_student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  SELECT * INTO v_policy FROM public.fee_policies ORDER BY updated_at DESC LIMIT 1;
  IF NOT FOUND THEN
    v_policy.due_day_of_month := 7;
    v_policy.sibling_discount_omr := 5;
    v_policy.referral_discount_omr := 5;
  END IF;

  v_due_date := make_date(p_year, p_month, v_policy.due_day_of_month);

  SELECT invoice_id INTO v_invoice_id
  FROM public.invoices
  WHERE student_id = p_student_id
    AND billing_year = p_year
    AND billing_month = p_month;

  IF v_invoice_id IS NULL THEN
    INSERT INTO public.invoices (
      student_id, billing_month, billing_year, amount_due, status
    ) VALUES (
      p_student_id, p_month, p_year, 0, 'open'
    )
    RETURNING invoice_id INTO v_invoice_id;
  END IF;

  DELETE FROM public.invoice_line_items WHERE invoice_id = v_invoice_id;

  -- Monthly batch fees
  FOR v_enrollment IN
    SELECT b.batch_name, fp.display_name AS plan_name, fp.boys_monthly_fee, fp.girls_monthly_fee
    FROM public.batch_members bm
    JOIN public.batches b ON b.batch_id = bm.batch_id
    LEFT JOIN public.fee_plan_templates fp ON fp.fee_plan_id = b.fee_plan_id
    WHERE bm.student_id = p_student_id
  LOOP
    IF v_student.gender = 'boy' THEN
      v_monthly_fee := COALESCE(v_enrollment.boys_monthly_fee, 0);
    ELSE
      v_monthly_fee := COALESCE(v_enrollment.girls_monthly_fee, 0);
    END IF;

    IF v_monthly_fee > 0 THEN
      INSERT INTO public.invoice_line_items (invoice_id, description, amount, line_type)
      VALUES (
        v_invoice_id,
        'Monthly fee — ' || COALESCE(v_enrollment.batch_name, v_enrollment.plan_name, 'Batch'),
        v_monthly_fee,
        'monthly_batch'
      );
      v_subtotal := v_subtotal + v_monthly_fee;
    END IF;
  END LOOP;

  -- One-time registration + dress (first admission globally)
  SELECT COALESCE(fp.registration_fee, 10), COALESCE(fp.dress_fee, 10)
  INTO v_reg_fee, v_dress_fee
  FROM public.batch_members bm
  JOIN public.batches b ON b.batch_id = bm.batch_id
  LEFT JOIN public.fee_plan_templates fp ON fp.fee_plan_id = b.fee_plan_id
  WHERE bm.student_id = p_student_id
  LIMIT 1;

  v_reg_fee := COALESCE(v_reg_fee, 10);
  v_dress_fee := COALESCE(v_dress_fee, 10);

  IF NOT EXISTS (
    SELECT 1 FROM public.student_one_time_charge_ledger
    WHERE student_id = p_student_id AND charge_type = 'registration'
  ) THEN
    INSERT INTO public.invoice_line_items (invoice_id, description, amount, line_type)
    VALUES (v_invoice_id, 'Registration (one-time)', v_reg_fee, 'registration');
    v_subtotal := v_subtotal + v_reg_fee;

    INSERT INTO public.student_one_time_charge_ledger (student_id, charge_type, invoice_id)
    VALUES (p_student_id, 'registration', v_invoice_id)
    ON CONFLICT (student_id, charge_type) DO NOTHING;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.student_one_time_charge_ledger
    WHERE student_id = p_student_id AND charge_type = 'dress'
  ) THEN
    INSERT INTO public.invoice_line_items (invoice_id, description, amount, line_type)
    VALUES (v_invoice_id, 'Academy dress (one-time)', v_dress_fee, 'dress');
    v_subtotal := v_subtotal + v_dress_fee;

    INSERT INTO public.student_one_time_charge_ledger (student_id, charge_type, invoice_id)
    VALUES (p_student_id, 'dress', v_invoice_id)
    ON CONFLICT (student_id, charge_type) DO NOTHING;
  END IF;

  -- Sibling discount (boys only)
  IF v_student.gender = 'boy' AND v_student.is_sibling_discount_eligible THEN
  INSERT INTO public.invoice_line_items (invoice_id, description, amount, line_type)
    VALUES (
      v_invoice_id,
      'Sibling discount',
      -v_policy.sibling_discount_omr,
      'sibling_discount'
    );
    v_discount_total := v_discount_total + v_policy.sibling_discount_omr;
  END IF;

  -- Referral discount (one month)
  IF v_student.referral_discount_month = p_month
     AND v_student.referral_discount_year = p_year THEN
    INSERT INTO public.invoice_line_items (invoice_id, description, amount, line_type)
    VALUES (
      v_invoice_id,
      'New admission referral discount',
      -v_policy.referral_discount_omr,
      'referral_discount'
    );
    v_discount_total := v_discount_total + v_policy.referral_discount_omr;
  END IF;

  v_total_due := GREATEST(v_subtotal - v_discount_total, 0);

  SELECT COALESCE(SUM(amount_paid), 0) INTO v_paid
  FROM public.payments
  WHERE invoice_id = v_invoice_id;

  IF v_paid >= v_total_due AND v_total_due > 0 THEN
    v_status := 'paid';
  ELSIF v_paid > 0 THEN
    v_status := 'partial';
  ELSE
    v_status := 'open';
  END IF;

  UPDATE public.invoices
  SET subtotal = v_subtotal,
      discount_total = v_discount_total,
      total_due = v_total_due,
      amount_due = v_total_due,
      due_date = v_due_date,
      generated_at = now(),
      status = v_status
  WHERE invoice_id = v_invoice_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'line_item_id', li.line_item_id,
      'description', li.description,
      'amount', li.amount,
      'line_type', li.line_type
    ) ORDER BY li.created_at
  ), '[]'::jsonb)
  INTO v_line_items
  FROM public.invoice_line_items li
  WHERE li.invoice_id = v_invoice_id;

  RETURN jsonb_build_object(
    'invoice_id', v_invoice_id,
    'student_id', p_student_id,
    'billing_year', p_year,
    'billing_month', p_month,
    'subtotal', v_subtotal,
    'discount_total', v_discount_total,
    'total_due', v_total_due,
    'amount_paid', v_paid,
    'balance_due', GREATEST(v_total_due - v_paid, 0),
    'due_date', v_due_date,
    'status', v_status,
    'line_items', v_line_items
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_student_billing(uuid, integer, integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS on new tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.fee_plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_one_time_charge_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rw_approved_staff ON public.fee_plan_templates;
CREATE POLICY rw_approved_staff ON public.fee_plan_templates
  FOR ALL TO authenticated
  USING (public.has_coach_access() OR public.is_current_user_admin())
  WITH CHECK (public.has_coach_access() OR public.is_current_user_admin());

DROP POLICY IF EXISTS rw_approved_staff ON public.fee_policies;
CREATE POLICY rw_approved_staff ON public.fee_policies
  FOR ALL TO authenticated
  USING (public.has_coach_access() OR public.is_current_user_admin())
  WITH CHECK (public.has_coach_access() OR public.is_current_user_admin());

DROP POLICY IF EXISTS rw_approved_staff ON public.invoice_line_items;
CREATE POLICY rw_approved_staff ON public.invoice_line_items
  FOR ALL TO authenticated
  USING (public.has_coach_access() OR public.is_current_user_admin())
  WITH CHECK (public.has_coach_access() OR public.is_current_user_admin());

DROP POLICY IF EXISTS rw_approved_staff ON public.student_one_time_charge_ledger;
CREATE POLICY rw_approved_staff ON public.student_one_time_charge_ledger
  FOR ALL TO authenticated
  USING (public.has_coach_access() OR public.is_current_user_admin())
  WITH CHECK (public.has_coach_access() OR public.is_current_user_admin());
