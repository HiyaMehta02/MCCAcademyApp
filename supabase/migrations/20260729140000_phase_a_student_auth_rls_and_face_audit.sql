-- =============================================================================
-- Phase A — A5: student_auth RLS (embeddings stay server-only)
-- =============================================================================
-- Goal: mobile clients (anon / authenticated coach JWTs) must NOT read or write
-- face_embedding (or any student_auth row). Only the Face API, using service_role
-- (SUPABASE_KEY), may access this table.
--
-- Defense in depth (two locks):
--   1) REVOKE table privileges  → PostgREST cannot even attempt the operation
--   2) RLS + deny policies      → even if someone re-GRANTs later, rows stay blocked
--
-- Reminder: service_role BYPASSES RLS in Supabase. That is why API AuthZ (A2) is
-- still required — RLS alone cannot stop a malicious enroll via the Face API.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1) Turn on Row Level Security
-- ---------------------------------------------------------------------------
-- What: Every row-level access for roles subject to RLS must pass a policy.
-- Why:  Without RLS, a GRANT SELECT to authenticated would expose all embeddings.
-- Note: Idempotent — safe if RLS is already enabled (your DB already has it ON).
ALTER TABLE public.student_auth ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- 2) Revoke client privileges
-- ---------------------------------------------------------------------------
-- What: Remove ALL table rights from PUBLIC, anon, and authenticated.
-- Why:  Least privilege. Coaches use the `authenticated` role via the mobile
--       Supabase client. They have no product need to query student_auth —
--       enrollment/attendance go through the Face API, not direct table reads.
-- PUBLIC: covers default/inherited grants that would otherwise leak to roles.
REVOKE ALL ON TABLE public.student_auth FROM PUBLIC;
REVOKE ALL ON TABLE public.student_auth FROM anon;
REVOKE ALL ON TABLE public.student_auth FROM authenticated;


-- ---------------------------------------------------------------------------
-- 3) Grant only the Face API role
-- ---------------------------------------------------------------------------
-- What: Allow service_role to SELECT/INSERT/UPDATE/DELETE.
-- Why:  FastAPI upserts embeddings on /enroll and reads them for attendance.
--       service_role is the elevated key in server/.env (SUPABASE_KEY) — never
--       ship this key in the mobile app.
-- Note: IF NOT already granted, this makes the server path explicit in the migration.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_auth TO service_role;


-- ---------------------------------------------------------------------------
-- 4) Explicit deny policies (intent visible in pg_policy)
-- ---------------------------------------------------------------------------
-- What: FOR ALL … USING (false) WITH CHECK (false) means every row fails the
--       policy check for that role — no read, no write.
-- Why:  Preferred for the lab/audit: `select polname from pg_policy …` shows
--       named policies, not an empty list. Also survives a mistaken future GRANT
--       until someone also drops/changes these policies.
--
-- USING (false)      → blocks SELECT / UPDATE / DELETE (row visibility)
-- WITH CHECK (false) → blocks INSERT / UPDATE (new row must pass check)

DROP POLICY IF EXISTS student_auth_deny_anon ON public.student_auth;
CREATE POLICY student_auth_deny_anon
  ON public.student_auth
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS student_auth_deny_authenticated ON public.student_auth;
CREATE POLICY student_auth_deny_authenticated
  ON public.student_auth
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);


-- ---------------------------------------------------------------------------
-- 5) (Optional cleanup) Drop any old permissive policies if they appear later
-- ---------------------------------------------------------------------------
-- Example — only run if you discover a bad open policy in Advisors / pg_policy:
--   DROP POLICY IF EXISTS student_auth_select_authenticated ON public.student_auth;
-- Leave commented until you know a real policy name to remove.


-- =============================================================================
-- Phase A — A6: face_api_audit_log  (add DDL + RLS here when you do A6)
-- =============================================================================
-- CREATE TABLE … columns only for who/action/student/batch/success/timestamp
-- ENABLE RLS; REVOKE from anon/authenticated; GRANT to service_role; deny policies
-- Do NOT store image bytes, base64, or embeddings in the audit table.
