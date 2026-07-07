# MCCC Academy — Environments

Living reference for **dev**, **staging**, and **production** separation.  
Fill in real URLs and procedures as you complete Sprint 0 DevSecOps tasks.

---

## Projects overview

| Environment | Supabase project | Face API base URL | Mobile build (EAS) | Purpose |
|-------------|------------------|-------------------|--------------------|---------|
| **dev** | `mccc-dev` _(fill in)_ | `http://<LAN_IP>:8000` _(local)_ | `development` profile | Daily coach development |
| **staging** | `mccc-staging` _(fill in)_ | `https://...` _(fill in)_ | `preview` profile | QA, demos, wipe/reseed |
| **prod** | `mccc-prod` _(fill in)_ | `https://...` _(fill in)_ | `production` profile | Live academy data |

**Rule:** Staging must be wipeable without affecting production. Never point a staging build at prod Supabase or prod API.

---

## Client variables (`EXPO_PUBLIC_*`)

Set in `client/.env` locally or via **EAS Secrets** per build profile.

| Variable | dev | staging | prod |
|----------|-----|---------|------|
| `EXPO_PUBLIC_SUPABASE_URL` | dev project URL | staging project URL | prod project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | dev anon/publishable key | staging anon key | prod anon key |
| `EXPO_PUBLIC_API_BASE_URL` | `http://<PC_LAN_IP>:8000` | `https://<staging-api-host>` | `https://<prod-api-host>` |

```bash
# Example EAS secrets (run per profile — replace values)
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://xxxx.supabase.co" --type string
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..." --type string
eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value "https://api-staging.example.com" --type string
```

---

## Server variables (Face API host)

Set on Railway / Fly.io / Render / VPS — **not** in git.

| Variable | dev | staging | prod |
|----------|-----|---------|------|
| `SUPABASE_URL` | dev URL | staging URL | prod URL |
| `SUPABASE_KEY` | dev **secret** / service_role | staging secret | prod secret |
| `SUPABASE_ANON_KEY` | dev anon key | staging anon key | prod anon key |
| `DEBUG_ENROLL_IMAGES` | `1` (optional) | **`0`** | **`0`** |

---

## Local development

1. Copy `client/.env.example` → `client/.env` and `server/.env.example` → `server/.env`.
2. Point both at **dev** Supabase credentials.
3. Start API: `cd server && uvicorn main:app --host 0.0.0.0 --port 8000`
4. Set `EXPO_PUBLIC_API_BASE_URL` to your PC’s LAN IP (same Wi‑Fi as the device).
5. Android dev builds may use HTTP (`usesCleartextTraffic`); staging/prod API must be **HTTPS only**.

---

## Staging reset procedure

_(Document your steps after first staging setup.)_

1. Pause or scale down staging API if needed.
2. In Supabase **staging** project: truncate/reseed tables or restore from seed script.
3. Re-run `server/scripts/bootstrap_admin_coach.py` against staging if admin coach was wiped.
4. Smoke-test: login → enroll face → attendance → fees (when available).

---

## API auth verification (after deploy)

Protected routes require `Authorization: Bearer <coach_jwt>`:

- `POST /enroll`
- `POST /check-attendance`
- `GET /branches`, `GET /batches/{id}`, `GET /students/{id}`

```bash
# Should return 401 (no token)
curl -s -o /dev/null -w "%{http_code}" -X POST https://YOUR_STAGING_API/enroll

# Should return 401 or 422 (missing form), not 200 — with invalid token
curl -s -o /dev/null -w "%{http_code}" -X POST https://YOUR_STAGING_API/enroll \
  -H "Authorization: Bearer invalid"

# With valid coach JWT from a logged-in session (replace TOKEN):
curl -X POST https://YOUR_STAGING_API/enroll \
  -H "Authorization: Bearer TOKEN" \
  -F "student_id=..." -F "file=@photo.jpg"
```

---

## CI / GitHub

- Workflow: `.github/workflows/ci.yml` — lint client, compile-check Python server.
- Enable **branch protection**: require CI pass on PRs.
- Enable **Dependabot** for `client/` and `server/` (GitHub → Settings → Security).

---

## Recorded URLs (fill in)

| Item | dev | staging | prod |
|------|-----|---------|------|
| Supabase URL | | | |
| Supabase project ref | | | |
| Face API URL | | | |
| EAS profile names | development | preview | production |
| Last staging reset | — | — | — |

---

## Contacts / escalation

_(Optional: who owns prod access, who can rotate secrets.)_

---

## RLS Security Advisor

**Last reviewed:** 2026-07-07  
**Export:** `supabase-warning.csv` (26 warnings, 0 errors)  
**Remediation migration:** `supabase/migrations/20260707120000_security_advisor_sprint0.sql`

### Summary by group

| Group | Count | Priority | Action |
|-------|------:|----------|--------|
| **A — Fix immediately** | 3 types | High | Apply migration + enable leaked-password check |
| **B — Fixed by migration (RPC grants)** | 22 rows | High | Same migration; re-run advisor |
| **C — Accept / defer** | 2 | Low | Document; fix before prod if needed |

### A — Fix immediately

#### 1. `admin_insert_coach` / `admin_set_coach_must_set_password` callable by anon (CRITICAL)

Anyone with the anon key could create coaches if these stay public.

**Fix:** Migration revokes `EXECUTE` from `anon` / `authenticated` / `PUBLIC`; grants `service_role` only. Coach creation stays on Face API `/admin/coaches` (admin JWT) and `bootstrap_admin_coach.py`.

#### 2. `student-auth-photos` public bucket allows listing (CRITICAL)

Policy `student_auth_photos_select` lets clients list **all** files in the bucket.

**Fix:** Migration drops that policy. Known object URLs still work; directory listing does not.

**Verify:** Supabase → Storage → `student-auth-photos` → Policies — no broad `SELECT` for `anon`.

#### 3. Leaked password protection disabled

**Fix (Dashboard, ~1 min):** Authentication → Providers → Email → enable **Leaked password protection** (HaveIBeenPwned).

### B — Fixed by migration `20260707120000_security_advisor_sprint0.sql`

| Lint | Functions / objects | What migration does |
|------|---------------------|---------------------|
| `function_search_path_mutable` | `match_face` | `SET search_path = public` |
| `anon_security_definer_function_executable` | 11 functions | `REVOKE` from `anon` + `PUBLIC` |
| `authenticated_security_definer_function_executable` | admin + trigger RPCs | Revoke from `authenticated` where not needed |

**Coach RPCs kept for `authenticated` only** (app uses these):

- `coach_must_set_password`, `clear_must_set_password`
- `current_coach_id`, `current_coach_status`
- `has_coach_access`, `is_current_user_admin`
- `refresh_student_billing` (has internal coach guard)

**Revoked from app roles** (trigger / server-only):

- `coaches_set_updated_at`, `enforce_coach_admin_guard`
- `admin_insert_coach`, `admin_set_coach_must_set_password`
- `match_face` → `service_role` only

### C — Accept / defer (documented)

| Warning | Why defer | Revisit |
|---------|-----------|---------|
| `extension_in_public` (`vector`) | Standard pgvector setup; moving schemas is risky | Before prod hardening / Supabase upgrade |
| `authenticated_security_definer_function_executable` on intentional coach RPCs | Linter flags any `SECURITY DEFINER` + `authenticated`; functions use `auth.uid()` or internal guards | Sprint 0.5 — consider `SECURITY INVOKER` where safe |

### How to apply

1. Supabase Dashboard → **SQL Editor** → paste/run  
   `supabase/migrations/20260707120000_security_advisor_sprint0.sql`
2. Enable leaked password protection (Dashboard).
3. **Advisors → Security** → re-run; expect **~2–8 warnings** remaining (extension + residual DEFINER notices).
4. Smoke-test app: login, set password, coach requests, fees refresh, enroll, attendance.

### Post-migration expected warnings

- `extension_in_public` (vector) — accepted until pgvector schema move
- Some `authenticated_security_definer_function_executable` on coach helpers — accepted with guards documented above

### Sprint 0 Task 11 — done when

- [x] Advisor export saved (`supabase-warning.csv`)
- [ ] Migration applied on dev project
- [ ] Leaked password protection enabled
- [ ] Critical items (admin RPCs, storage listing) resolved
- [ ] App smoke-test passed after migration
- [ ] Remaining warnings documented in this section
