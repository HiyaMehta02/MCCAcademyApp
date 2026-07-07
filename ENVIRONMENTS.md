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
