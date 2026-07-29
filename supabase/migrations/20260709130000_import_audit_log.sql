-- Phase C: CSV import audit log (MVP early deployment).

CREATE TABLE IF NOT EXISTS public.import_audit_log (
  import_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES public.coaches(coach_id),
  auth_user_id uuid,
  filename text,
  dry_run boolean NOT NULL DEFAULT false,
  total_rows integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS import_audit_log_created_at_idx
  ON public.import_audit_log (created_at DESC);

ALTER TABLE public.import_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rw_admin_import_audit ON public.import_audit_log;
CREATE POLICY rw_admin_import_audit ON public.import_audit_log
  FOR ALL TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());
