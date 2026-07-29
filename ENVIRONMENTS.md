# MCCC Academy — Environments

Living reference for **dev**, **staging**, and **production** separation.

**Last updated:** 2026-07-07

---

## Supabase strategy (free tier)

Supabase **free plan allows one active project**. This repo uses a **single shared database** for all phases until upgrade or launch:

| Dashboard / plan | Value |
|------------------|-------|
| **Project ref** | `wukmanrpnbfoyqtjdxjs` |
| **Project URL** | `https://wukmanrpnbfoyqtjdxjs.supabase.co` |
| **Migrations** | All files in `supabase/migrations/` applied to this project (including `20260707120000_security_advisor_sprint0.sql`) |
| **Admin bootstrap** | `server/scripts/bootstrap_admin_coach.py` run against this project |

**What still separates environments**

- **Face API host** — local LAN for dev; HTTPS host for staging/preview builds; separate prod host at launch.
- **EAS build profiles** — `development` / `preview` / `production` with different `EXPO_PUBLIC_*` secrets.
- **Server flags** — e.g. `DEBUG_ENROLL_IMAGES=1` locally, `0` on deployed hosts.

**Deferred until paid plan or production launch**

- Separate Supabase projects (`mccc-staging`, `mccc-prod`).
- Wiping staging data without affecting production (requires a second project).

At launch, create a **new prod project**, run all migrations, rotate keys, and point the `production` EAS profile at prod URLs only.

---

## Projects overview

| Environment | Supabase | Face API base URL | Mobile build (EAS) | Purpose |
|-------------|----------|-------------------|--------------------|---------|
| **dev** | Shared project `wukmanrpnbfoyqtjdxjs` | `http://<LAN_IP>:8000` (local) | `development` profile | Daily coach development |
| **staging** | Same shared project | `https://<staging-api-host>` _(deploy pending)_ | `preview` profile | QA, preview builds; API on HTTPS host |
| **prod** | New project at launch _(not created yet)_ | `https://<prod-api-host>` _(at launch)_ | `production` profile | Live academy data |

**Rule (current free tier):** Treat the shared project as **production data** — avoid destructive tests. When a second project is available, use it for staging and keep prod isolated.

---

## Client variables (`EXPO_PUBLIC_*`)

Set in `client/.env` locally or via **EAS Secrets** per build profile.

| Variable | dev (local) | staging (preview) | prod (launch) |
|----------|-------------|-------------------|---------------|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://wukmanrpnbfoyqtjdxjs.supabase.co` | same (until second project) | new prod project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | publishable/anon key for shared project | same | prod anon key |
| `EXPO_PUBLIC_API_BASE_URL` | `http://<PC_LAN_IP>:8000` | `https://<staging-api-host>` | `https://<prod-api-host>` |

**Current local values** (`client/.env`):

- `EXPO_PUBLIC_SUPABASE_URL=https://wukmanrpnbfoyqtjdxjs.supabase.co`
- `EXPO_PUBLIC_API_BASE_URL=http://192.168.68.67:8000` _(update LAN IP when DHCP changes)_

```bash
# EAS secrets — preview profile (staging API; same Supabase for now)
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://wukmanrpnbfoyqtjdxjs.supabase.co" --type string
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon-key>" --type string
eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value "https://<staging-api-host>" --type string
```

---

## Server variables (Face API host)

Set on Railway / Fly.io / Render / VPS — **not** in git.

| Variable | dev (local) | staging / preview host | prod host |
|----------|-------------|------------------------|-----------|
| `SUPABASE_URL` | `https://wukmanrpnbfoyqtjdxjs.supabase.co` | same | prod URL at launch |
| `SUPABASE_KEY` | secret / service_role for shared project | same | prod secret |
| `SUPABASE_ANON_KEY` | anon key for shared project | same | prod anon |
| `DEBUG_ENROLL_IMAGES` | `1` (optional) | **`0`** | **`0`** |

**Current local values** (`server/.env`): active keys point at `wukmanrpnbfoyqtjdxjs`. Remove or ignore stale commented refs to other project IDs.

---

## Local development

1. Copy `client/.env.example` → `client/.env` and `server/.env.example` → `server/.env`.
2. Point both at the shared project (`wukmanrpnbfoyqtjdxjs`).
3. Start API: `cd server && uvicorn main:app --host 0.0.0.0 --port 8000`
4. Set `EXPO_PUBLIC_API_BASE_URL` to your PC’s LAN IP (same Wi‑Fi as the device).
5. Android dev builds may use HTTP (`usesCleartextTraffic`); deployed staging/prod API must be **HTTPS only**.

---

## Staging reset procedure

**Not available on free tier** (single shared DB). Options until a second project exists:

1. **Avoid destructive QA** on the shared project; use test branches/students with clear naming.
2. **Manual selective cleanup** via SQL Editor (truncate specific tables) — only if you accept data loss on the only copy.
3. **At launch:** create `mccc-prod`, migrate fresh, and repurpose or recreate a staging project on a paid plan.

When a dedicated staging project exists:

1. Pause or scale down staging API if needed.
2. Truncate/reseed tables in the **staging** project only.
3. Re-run `server/scripts/bootstrap_admin_coach.py` against staging if admin coach was wiped.
4. Smoke-test: login → enroll face → attendance → fees.

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
- **Dependabot:** `.github/dependabot.yml` — active for `client/` and `server/`.

---

## Recorded URLs

| Item | dev | staging | prod |
|------|-----|---------|------|
| Supabase URL | `https://wukmanrpnbfoyqtjdxjs.supabase.co` | same (shared) | _(create at launch)_ |
| Supabase project ref | `wukmanrpnbfoyqtjdxjs` | same | _(create at launch)_ |
| Face API URL | `http://192.168.68.67:8000` | _(deploy pending)_ | _(at launch)_ |
| EAS profile names | `development` | `preview` | `production` |
| Last staging reset | N/A (single DB) | N/A | — |

---

## Contacts / escalation

_(Optional: who owns prod access, who can rotate secrets.)_

---

## RLS Security Advisor

**Last reviewed:** 2026-07-07  
**Export:** `supabase-warning.csv` (26 warnings, 0 errors)  
**Remediation migration:** `supabase/migrations/20260707120000_security_advisor_sprint0.sql` — **applied** to shared project

### Summary by group

| Group | Count | Priority | Action |
|-------|------:|----------|--------|
| **A — Fix immediately** | 3 types | High | Migration applied; enable leaked-password check |
| **B — Fixed by migration (RPC grants)** | 22 rows | High | Applied; re-run advisor to confirm |
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

### Post-migration expected warnings

- `extension_in_public` (vector) — accepted until pgvector schema move
- Some `authenticated_security_definer_function_executable` on coach helpers — accepted with guards documented above

### Sprint 0 Task 11 — done when

- [x] Advisor export saved (`supabase-warning.csv`)
- [x] Migration applied on shared project
- [ ] Leaked password protection enabled
- [x] Critical items (admin RPCs, storage listing) resolved via migration
- [ ] App smoke-test passed after migration
- [x] Remaining warnings documented in this section
