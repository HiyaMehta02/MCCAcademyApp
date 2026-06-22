-- Coach ID + password auth (Supabase Auth email/password with synthetic internal emails).
-- login_id is what coaches type; auth.users.email = lower(login_id) || '@login.mccc.internal'

ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS login_id text,
  ADD COLUMN IF NOT EXISTS must_set_password boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS password_set_at timestamptz;

COMMENT ON COLUMN public.coaches.login_id IS
  'Public coach login identifier (case-insensitive). Maps to auth email login_id@login.mccc.internal';
COMMENT ON COLUMN public.coaches.must_set_password IS
  'When true, coach must set a new password on next app login before accessing data.';

CREATE UNIQUE INDEX IF NOT EXISTS coaches_login_id_lower_unique
  ON public.coaches (lower(login_id))
  WHERE login_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.coach_must_set_password()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT c.must_set_password FROM public.coaches c WHERE c.auth_user_id = auth.uid() LIMIT 1),
    false
  );
$$;

COMMENT ON FUNCTION public.coach_must_set_password() IS
  'True when the signed-in coach must change their temporary password before using the app.';

CREATE OR REPLACE FUNCTION public.clear_must_set_password()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.coaches
  SET must_set_password = false,
      password_set_at = now(),
      updated_at = now()
  WHERE auth_user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No coach record linked to this account';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.clear_must_set_password() IS
  'Called after coach sets a new password; clears must_set_password for auth.uid().';

GRANT EXECUTE ON FUNCTION public.coach_must_set_password() TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_must_set_password() TO authenticated;
