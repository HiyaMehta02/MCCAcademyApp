-- Align schema with academy owner requirements (2026-07):
-- Wadi Kabir naming, resident card fields, off-schedule/cross-branch attendance,
-- fee reminder days (15th & 25th), coach multi-branch attendance.

-- ---------------------------------------------------------------------------
-- 1. Branch naming: Muscat → Wadi Kabir
-- ---------------------------------------------------------------------------
UPDATE public.branches
SET branch_name = 'Wadi Kabir Branch'
WHERE branch_id = '49908128-0724-4193-ab1c-4c657ad64f9e'
  AND branch_name ILIKE '%muscat%';

UPDATE public.batches
SET batch_name = replace(batch_name, '(Muscat)', '(Wadi Kabir)')
WHERE branch_id = '49908128-0724-4193-ab1c-4c657ad64f9e'
  AND batch_name LIKE '%(Muscat)%';

-- ---------------------------------------------------------------------------
-- 2. Students: kit size + Oman resident card (both sides)
-- ---------------------------------------------------------------------------
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS clothes_size text,
  ADD COLUMN IF NOT EXISTS resident_card_front_path text,
  ADD COLUMN IF NOT EXISTS resident_card_back_path text;

COMMENT ON COLUMN public.students.clothes_size IS 'Kit / clothes size from academy roster (optional).';
COMMENT ON COLUMN public.students.resident_card_front_path IS 'Storage path for Oman resident card front image.';
COMMENT ON COLUMN public.students.resident_card_back_path IS 'Storage path for Oman resident card back image.';

-- ---------------------------------------------------------------------------
-- 3. Fee plans: expected schedule days for off-batch warnings
-- ---------------------------------------------------------------------------
ALTER TABLE public.fee_plan_templates
  ADD COLUMN IF NOT EXISTS schedule_days text[];

COMMENT ON COLUMN public.fee_plan_templates.schedule_days IS
  'Expected training weekdays (monday..sunday). Used to warn when attendance is off-schedule.';

UPDATE public.fee_plan_templates
SET schedule_days = ARRAY['monday','tuesday','wednesday','thursday','friday']
WHERE plan_code IN ('weekday_batch', 'weekday_evening')
  AND schedule_days IS NULL;

UPDATE public.fee_plan_templates
SET schedule_days = ARRAY['saturday','sunday']
WHERE plan_code = 'weekend_batch'
  AND schedule_days IS NULL;

-- Special / Azaiba / parents: leave NULL until owner confirms exact days

-- ---------------------------------------------------------------------------
-- 4. Student attendance: off-schedule + cross-branch flags
-- ---------------------------------------------------------------------------
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS is_off_schedule boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_cross_branch boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN public.attendance.is_off_schedule IS
  'True when the student attended on a day outside their enrolled WD/WE/SPL schedule.';
COMMENT ON COLUMN public.attendance.is_cross_branch IS
  'True when attendance is at a branch other than the student home branch.';

-- ---------------------------------------------------------------------------
-- 5. Fee policies: reminder days 15 & 25 (owner request)
-- ---------------------------------------------------------------------------
ALTER TABLE public.fee_policies
  ADD COLUMN IF NOT EXISTS reminder_days_of_month integer[] NOT NULL DEFAULT ARRAY[15, 25];

UPDATE public.fee_policies
SET reminder_days_of_month = ARRAY[15, 25],
    due_day_of_month = 15,
    updated_at = now();

COMMENT ON COLUMN public.fee_policies.reminder_days_of_month IS
  'Days of month to surface unpaid-fees reminders (e.g. 15 and 25).';

-- ---------------------------------------------------------------------------
-- 6. Coach multi-branch attendance
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coach_attendance (
  coach_attendance_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coaches(coach_id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(branch_id),
  attendance_date date NOT NULL,
  session_start time,
  session_end time,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  left_early_minutes integer CHECK (left_early_minutes IS NULL OR left_early_minutes >= 0),
  status text NOT NULL DEFAULT 'present'
    CHECK (status IN ('present', 'absent', 'partial')),
  notes text,
  recorded_by uuid REFERENCES public.coaches(coach_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_id, branch_id, attendance_date, session_start)
);

CREATE INDEX IF NOT EXISTS coach_attendance_coach_date_idx
  ON public.coach_attendance (coach_id, attendance_date DESC);

CREATE INDEX IF NOT EXISTS coach_attendance_branch_date_idx
  ON public.coach_attendance (branch_id, attendance_date DESC);

COMMENT ON TABLE public.coach_attendance IS
  'Per-branch coach attendance. Coaches may have separate sessions at Wadi Kabir and Azaiba on the same day.';

ALTER TABLE public.coach_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rw_approved_staff ON public.coach_attendance;
CREATE POLICY rw_approved_staff ON public.coach_attendance
  FOR ALL TO authenticated
  USING (public.has_coach_access() OR public.is_current_user_admin())
  WITH CHECK (public.has_coach_access() OR public.is_current_user_admin());

-- Optional planned session windows per coach/branch (e.g. 17:00-19:00 Wadi Kabir)
CREATE TABLE IF NOT EXISTS public.coach_branch_sessions (
  session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coaches(coach_id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(branch_id),
  label text,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time),
  UNIQUE (coach_id, branch_id, start_time, end_time)
);

ALTER TABLE public.coach_branch_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rw_approved_staff ON public.coach_branch_sessions;
CREATE POLICY rw_approved_staff ON public.coach_branch_sessions
  FOR ALL TO authenticated
  USING (public.has_coach_access() OR public.is_current_user_admin())
  WITH CHECK (public.has_coach_access() OR public.is_current_user_admin());

-- ---------------------------------------------------------------------------
-- 7. Helper: expected weekdays for a student (fee plans + custom days + squad schedule)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.student_expected_weekdays(p_student_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT array_agg(DISTINCT lower(day_name) ORDER BY lower(day_name))
      FROM (
        -- Fee program schedule_days
        SELECT unnest(fp.schedule_days) AS day_name
        FROM public.student_fee_plan_enrollments sfpe
        JOIN public.fee_plan_templates fp ON fp.fee_plan_id = sfpe.fee_plan_id
        WHERE sfpe.student_id = p_student_id
          AND fp.schedule_days IS NOT NULL

        UNION ALL

        SELECT unnest(fp.schedule_days) AS day_name
        FROM public.batch_members bm
        JOIN public.batches b ON b.batch_id = bm.batch_id
        JOIN public.fee_plan_templates fp ON fp.fee_plan_id = b.fee_plan_id
        WHERE bm.student_id = p_student_id
          AND fp.schedule_days IS NOT NULL

        UNION ALL

        -- Custom day plans
        SELECT unnest(scp.selected_days) AS day_name
        FROM public.student_custom_plans scp
        WHERE scp.student_id = p_student_id

        UNION ALL

        -- Squad batch_schedule
        SELECT bs.day_of_week AS day_name
        FROM public.batch_members bm
        JOIN public.batch_schedule bs ON bs.batch_id = bm.batch_id
        WHERE bm.student_id = p_student_id
      ) days
      WHERE day_name IS NOT NULL AND btrim(day_name) <> ''
    ),
    ARRAY[]::text[]
  );
$$;

REVOKE ALL ON FUNCTION public.student_expected_weekdays(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.student_expected_weekdays(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. Private storage for resident cards
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-resident-cards',
  'student-resident-cards',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS student_resident_cards_select ON storage.objects;
CREATE POLICY student_resident_cards_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'student-resident-cards'
    AND (public.has_coach_access() OR public.is_current_user_admin())
  );

DROP POLICY IF EXISTS student_resident_cards_insert ON storage.objects;
CREATE POLICY student_resident_cards_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'student-resident-cards'
    AND (public.has_coach_access() OR public.is_current_user_admin())
  );

DROP POLICY IF EXISTS student_resident_cards_update ON storage.objects;
CREATE POLICY student_resident_cards_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'student-resident-cards'
    AND (public.has_coach_access() OR public.is_current_user_admin())
  )
  WITH CHECK (
    bucket_id = 'student-resident-cards'
    AND (public.has_coach_access() OR public.is_current_user_admin())
  );

DROP POLICY IF EXISTS student_resident_cards_delete ON storage.objects;
CREATE POLICY student_resident_cards_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'student-resident-cards'
    AND (public.has_coach_access() OR public.is_current_user_admin())
  );
