-- Billing RPC: squad batches + fee programs + custom day plans
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
  v_has_any_enrollment boolean := false;
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
  WHERE student_id = p_student_id AND billing_year = p_year AND billing_month = p_month;

  IF v_invoice_id IS NULL THEN
    INSERT INTO public.invoices (student_id, billing_month, billing_year, amount_due, status)
    VALUES (p_student_id, p_month, p_year, 0, 'open')
    RETURNING invoice_id INTO v_invoice_id;
  END IF;

  DELETE FROM public.invoice_line_items WHERE invoice_id = v_invoice_id;

  FOR v_enrollment IN
    SELECT b.batch_name, fp.display_name AS plan_name, fp.boys_monthly_fee, fp.girls_monthly_fee
    FROM public.batch_members bm
    JOIN public.batches b ON b.batch_id = bm.batch_id
    LEFT JOIN public.fee_plan_templates fp ON fp.fee_plan_id = b.fee_plan_id
    WHERE bm.student_id = p_student_id
  LOOP
    v_has_any_enrollment := true;
    IF v_student.gender = 'boy' THEN
      v_monthly_fee := COALESCE(v_enrollment.boys_monthly_fee, 0);
    ELSE
      v_monthly_fee := COALESCE(v_enrollment.girls_monthly_fee, 0);
    END IF;
    IF v_monthly_fee > 0 THEN
      INSERT INTO public.invoice_line_items (invoice_id, description, amount, line_type)
      VALUES (v_invoice_id, 'Monthly fee - ' || COALESCE(v_enrollment.batch_name, v_enrollment.plan_name, 'Batch'), v_monthly_fee, 'monthly_batch');
      v_subtotal := v_subtotal + v_monthly_fee;
    END IF;
  END LOOP;

  FOR v_enrollment IN
    SELECT fp.display_name AS plan_name, fp.boys_monthly_fee, fp.girls_monthly_fee, fp.fee_plan_id
    FROM public.student_fee_plan_enrollments sfpe
    JOIN public.fee_plan_templates fp ON fp.fee_plan_id = sfpe.fee_plan_id
    WHERE sfpe.student_id = p_student_id
      AND NOT EXISTS (
        SELECT 1 FROM public.batch_members bm2
        JOIN public.batches b2 ON b2.batch_id = bm2.batch_id
        WHERE bm2.student_id = p_student_id AND b2.fee_plan_id = sfpe.fee_plan_id
      )
  LOOP
    v_has_any_enrollment := true;
    IF v_student.gender = 'boy' THEN
      v_monthly_fee := COALESCE(v_enrollment.boys_monthly_fee, 0);
    ELSE
      v_monthly_fee := COALESCE(v_enrollment.girls_monthly_fee, 0);
    END IF;
    IF v_monthly_fee > 0 THEN
      INSERT INTO public.invoice_line_items (invoice_id, description, amount, line_type)
      VALUES (v_invoice_id, 'Program fee - ' || v_enrollment.plan_name, v_monthly_fee, 'monthly_batch');
      v_subtotal := v_subtotal + v_monthly_fee;
    END IF;
  END LOOP;

  FOR v_enrollment IN
    SELECT scp.plan_label, scp.selected_days, scp.boys_monthly_fee, scp.girls_monthly_fee
    FROM public.student_custom_plans scp
    WHERE scp.student_id = p_student_id
  LOOP
    v_has_any_enrollment := true;
    IF v_student.gender = 'boy' THEN
      v_monthly_fee := COALESCE(v_enrollment.boys_monthly_fee, 0);
    ELSE
      v_monthly_fee := COALESCE(v_enrollment.girls_monthly_fee, 0);
    END IF;
    IF v_monthly_fee > 0 THEN
      INSERT INTO public.invoice_line_items (invoice_id, description, amount, line_type)
      VALUES (v_invoice_id, 'Custom days - ' || COALESCE(v_enrollment.plan_label, array_to_string(v_enrollment.selected_days, ', ')), v_monthly_fee, 'monthly_batch');
      v_subtotal := v_subtotal + v_monthly_fee;
    END IF;
  END LOOP;

  IF v_has_any_enrollment
     OR EXISTS (SELECT 1 FROM public.student_fee_plan_enrollments WHERE student_id = p_student_id)
     OR EXISTS (SELECT 1 FROM public.student_custom_plans WHERE student_id = p_student_id) THEN
    SELECT COALESCE(fp.registration_fee, 10), COALESCE(fp.dress_fee, 10)
    INTO v_reg_fee, v_dress_fee
    FROM (
      SELECT b.fee_plan_id FROM public.batch_members bm
      JOIN public.batches b ON b.batch_id = bm.batch_id WHERE bm.student_id = p_student_id
      UNION
      SELECT fee_plan_id FROM public.student_fee_plan_enrollments WHERE student_id = p_student_id
      LIMIT 1
    ) src
    LEFT JOIN public.fee_plan_templates fp ON fp.fee_plan_id = src.fee_plan_id;
    v_reg_fee := COALESCE(v_reg_fee, 10);
    v_dress_fee := COALESCE(v_dress_fee, 10);

    IF NOT EXISTS (SELECT 1 FROM public.student_one_time_charge_ledger WHERE student_id = p_student_id AND charge_type = 'registration') THEN
      INSERT INTO public.invoice_line_items (invoice_id, description, amount, line_type)
      VALUES (v_invoice_id, 'Registration (one-time)', v_reg_fee, 'registration');
      v_subtotal := v_subtotal + v_reg_fee;
      INSERT INTO public.student_one_time_charge_ledger (student_id, charge_type, invoice_id)
      VALUES (p_student_id, 'registration', v_invoice_id) ON CONFLICT (student_id, charge_type) DO NOTHING;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.student_one_time_charge_ledger WHERE student_id = p_student_id AND charge_type = 'dress') THEN
      INSERT INTO public.invoice_line_items (invoice_id, description, amount, line_type)
      VALUES (v_invoice_id, 'Academy dress (one-time)', v_dress_fee, 'dress');
      v_subtotal := v_subtotal + v_dress_fee;
      INSERT INTO public.student_one_time_charge_ledger (student_id, charge_type, invoice_id)
      VALUES (p_student_id, 'dress', v_invoice_id) ON CONFLICT (student_id, charge_type) DO NOTHING;
    END IF;
  END IF;

  IF v_student.gender = 'boy' AND v_student.is_sibling_discount_eligible THEN
    INSERT INTO public.invoice_line_items (invoice_id, description, amount, line_type)
    VALUES (v_invoice_id, 'Sibling discount', -v_policy.sibling_discount_omr, 'sibling_discount');
    v_discount_total := v_discount_total + v_policy.sibling_discount_omr;
  END IF;

  IF v_student.referral_discount_month = p_month AND v_student.referral_discount_year = p_year THEN
    INSERT INTO public.invoice_line_items (invoice_id, description, amount, line_type)
    VALUES (v_invoice_id, 'New admission referral discount', -v_policy.referral_discount_omr, 'referral_discount');
    v_discount_total := v_discount_total + v_policy.referral_discount_omr;
  END IF;

  v_total_due := GREATEST(v_subtotal - v_discount_total, 0);
  SELECT COALESCE(SUM(amount_paid), 0) INTO v_paid FROM public.payments WHERE invoice_id = v_invoice_id;

  IF v_paid >= v_total_due AND v_total_due > 0 THEN v_status := 'paid';
  ELSIF v_paid > 0 THEN v_status := 'partial';
  ELSE v_status := 'open';
  END IF;

  UPDATE public.invoices
  SET subtotal = v_subtotal, discount_total = v_discount_total, total_due = v_total_due,
      amount_due = v_total_due, due_date = v_due_date, generated_at = now(), status = v_status
  WHERE invoice_id = v_invoice_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'line_item_id', li.line_item_id, 'description', li.description,
    'amount', li.amount, 'line_type', li.line_type
  ) ORDER BY li.created_at), '[]'::jsonb)
  INTO v_line_items FROM public.invoice_line_items li WHERE li.invoice_id = v_invoice_id;

  RETURN jsonb_build_object(
    'invoice_id', v_invoice_id, 'student_id', p_student_id,
    'billing_year', p_year, 'billing_month', p_month,
    'subtotal', v_subtotal, 'discount_total', v_discount_total, 'total_due', v_total_due,
    'amount_paid', v_paid, 'balance_due', GREATEST(v_total_due - v_paid, 0),
    'due_date', v_due_date, 'status', v_status, 'line_items', v_line_items
  );
END;
$$;
