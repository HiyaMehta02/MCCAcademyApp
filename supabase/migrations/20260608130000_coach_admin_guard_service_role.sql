-- Allow trusted service_role backend (FastAPI / bootstrap) to manage coach rows.
-- App admin JWT is verified in FastAPI before these calls; DB insert uses service_role
-- where auth.uid() is NULL so is_current_user_admin() is false without this bypass.

CREATE OR REPLACE FUNCTION public.enforce_coach_admin_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Backend uses SUPABASE_KEY (service_role): no auth.uid(), but JWT role is service_role.
  IF coalesce(auth.jwt()->>'role', '') = 'service_role' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF NOT public.is_current_user_admin() THEN
    IF TG_OP = 'UPDATE' THEN
      IF NEW.status IS DISTINCT FROM OLD.status
         OR NEW.is_admin IS DISTINCT FROM OLD.is_admin
         OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
        RAISE EXCEPTION 'Only admins can change coach status/admin/auth mapping';
      END IF;
    ELSIF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Only admins can create coach records';
    ELSIF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Only admins can delete coach records';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_coach_admin_guard() IS
  'Coach row guard: admins via auth.uid(), or trusted service_role backend after FastAPI admin check.';
