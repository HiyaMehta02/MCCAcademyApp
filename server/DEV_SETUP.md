## Face API dev setup (phone → PC)

1. **LAN IP**
  On the PC running the API: Windows `ipconfig` → note **Wi‑Fi** **IPv4** (e.g. `10.0.0.146`). Set `EXPO_PUBLIC_API_BASE_URL=http://<that-ip>:8000` in `client/.env`.
2. **Listen on all interfaces**
  Start Uvicorn bound to `0.0.0.0` so devices on the same Wi‑Fi can connect, not only `127.0.0.1`:
   `uvicorn main:app --host 0.0.0.0 --port 8000`
3. **Firewall**
  Allow **inbound TCP 8000** (or Python) on the PC; confirm from another device: open `http://<PC_IP>:8000/docs`.
4. **Same network**
  Phone and PC on the same Wi‑Fi; avoid guest/isolated SSIDs if devices cannot see each other.
5. **Android HTTP**
  After changing `app.config.js` (`usesCleartextTraffic`), rebuild the dev client so HTTP to your LAN API is allowed.
6. **Env reload**
  After editing `client/.env`, restart Expo (`npx expo start -c` if values seem stale).
7. **Supabase**
  `server/.env` must use the **service_role** key for `SUPABASE_KEY` (see `.env.example`). The mobile app must never contain that secret.
8. **Face matching (`match_face`)**
  The DB compares embeddings with **pgvector cosine** similarity (`1 - (embedding <=> query)`), not dlib’s Euclidean `face_distance` in Python. The value passed as `match_threshold` is a **cosine similarity** floor (see the function comment in Supabase). Tune with real enrollment/attendance tests if you see false accepts or rejects.

---

## Coach ID + password auth

Coaches sign in with a **Coach ID** and **password**. Supabase Auth stores credentials; `coaches.login_id` is the public identifier. Internal auth email: `{login_id}@login.mccc.internal`.

### One-time database migration

Apply the migration in Supabase (SQL Editor or CLI):

`supabase/migrations/20260607120000_coach_password_auth.sql`

This adds `login_id`, `must_set_password`, and RPCs `coach_must_set_password` / `clear_must_set_password`.

### Supabase Dashboard settings

1. **Authentication → Providers → Email** — keep **Email** enabled (required for password login).
2. **Disable Google** (optional) — Authentication → Providers → Google → off.
3. **Confirm email** — for internal coaches, disable “Confirm email” so temp passwords work immediately (Authentication → Providers → Email).

### Environment variables

**`server/.env`** (add anon key for admin JWT checks):

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_KEY=your-service-role-or-secret-key
SUPABASE_ANON_KEY=your-anon-key
```

**`client/.env`** — unchanged except ensure API URL is set for admin coach creation:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_API_BASE_URL=http://YOUR_PC_WIFI_IP:8000
```

---

## Testing the full auth flow

### Prerequisites

- Migration applied.
- FastAPI running: `cd server && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload`
- Expo running: `cd client && npx expo start -c`
- You have **one admin coach** in the database (see bootstrap below if starting fresh).

### A. Bootstrap first admin (one time)

**Option 1 — bootstrap script (easiest)**

From `server/` with `SUPABASE_URL` and `SUPABASE_KEY` in `.env`:

```bash
python scripts/bootstrap_admin_coach.py --login-id admin --password "TempPass123!" --first-name Admin --last-name User
```

Then sign in on the app as Coach ID `admin` with that temp password.

**Option 2 — link an existing coach row**

If you already have an admin from a prior OAuth setup, link them in SQL Editor:

```sql
-- Replace YOUR_AUTH_USER_UUID with auth.users.id for your admin
UPDATE public.coaches
SET login_id = 'admin',
    must_set_password = true,
    status = 'approved',
    is_admin = true
WHERE auth_user_id = 'YOUR_AUTH_USER_UUID';
```

Then in **Authentication → Users**, set email to `admin@login.mccc.internal` and a password (≥ 8 chars).

### B. Admin login → create coach

1. Open the app → **Coach Login**.
2. Sign in: Coach ID `admin`, temp password.
3. If prompted → **Set your password** → save a new password → land on home.
4. Navigate to **Coach Access Requests** (admin tab/screen) → **+ Create coach**.
5. Fill in:
   - Coach ID: e.g. `coach001`
   - Name, temp password (use **Generate**), leave admin off.
6. Tap **Create account** — note the alert with ID + temp password.

**API-only check:** `POST /admin/coaches` at `/docs` with `Authorization: Bearer <admin_access_token>`.

### C. New coach first login

1. Sign out (branch screen or pending screens).
2. Sign in as `coach001` + temp password.
3. App should route to **Set your password** (not home).
4. Set new password (≥ 8 chars, matching confirm).
5. App routes to **/(tabs)** home → select branch → use batches/attendance.

### D. Access control checks

| Scenario | Expected |
|----------|----------|
| Wrong password | Generic “Invalid coach ID or password” |
| Valid auth, no `coaches` row | **No coach account** screen |
| `coaches.status = pending` | Pending screen |
| `coaches.status = suspended` | Suspended screen |
| Non-admin opens Manage Coaches | “Admin access required” |
| Admin resets password | Coach forced to set-password on next login |

### E. Password reset (admin)

1. Admin → **Manage coaches** → **Reset password** section.
2. Enter coach ID + new temp password → **Reset password**.
3. Coach signs in with temp password → must set new password again.

### F. Regression: face API still works

After coach is approved and password set:

1. Pick a batch → **Take attendance** or **Add student**.
2. Confirm requests hit `EXPO_PUBLIC_API_BASE_URL` (same Wi‑Fi / firewall as before).

### Troubleshooting

| Issue | Fix |
|-------|-----|
| `coach_must_set_password` RPC missing | Run migration SQL |
| Admin create returns 503 | Add `SUPABASE_ANON_KEY` to `server/.env`, restart uvicorn |
| Admin create returns 403 | Signed-in user must have `is_admin = true` in `coaches` |
| Login fails for new coach | Confirm Auth user email is `{login_id}@login.mccc.internal` |
| RLS error on coach insert | `SUPABASE_KEY` must be service role, not anon |
| App skips set-password | Check `coaches.must_set_password = true` for that user |

### Disable Google OAuth (recommended)

Supabase Dashboard → Authentication → Providers → Google → disabled. The app no longer calls Google sign-in.
