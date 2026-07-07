-- Sprint 0 security advisor remediation (see ENVIRONMENTS.md § RLS Security Advisor).
-- Apply in Supabase SQL Editor on dev, then re-run Advisors → Security.

-- ---------------------------------------------------------------------------
-- 1. match_face — pin search_path; server (service_role) only
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.match_face(vector, double precision) SET search_path = public;

REVOKE ALL ON FUNCTION public.match_face(vector, double precision) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.match_face(vector, double precision) FROM anon;
REVOKE ALL ON FUNCTION public.match_face(vector, double precision) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.match_face(vector, double precision) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Admin / bootstrap RPCs — service_role only (Face API + scripts)
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_insert_coach(
  uuid, text, text, text, text, boolean
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.admin_set_coach_must_set_password(text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_insert_coach(
  uuid, text, text, text, text, boolean
) TO service_role;

GRANT EXECUTE ON FUNCTION public.admin_set_coach_must_set_password(text)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Trigger helpers — not callable via PostgREST RPC
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.coaches_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_coach_admin_guard() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Coach app RPCs — authenticated only (revoke anon / PUBLIC)
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.coach_must_set_password() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.clear_must_set_password() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_coach_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_coach_status() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_coach_access() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.refresh_student_billing(uuid, integer, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.coach_must_set_password() TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_must_set_password() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_coach_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_coach_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_coach_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_student_billing(uuid, integer, integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Storage — public bucket: drop broad list policy (lint 0025)
--    Direct object URLs still work when the path is known.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS student_auth_photos_select ON storage.objects;
