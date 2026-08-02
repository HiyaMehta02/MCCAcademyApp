# MCCC Academy — Full Application Security (AppSec) Plan

**Purpose:** Make this app as secure as a small production academy system can reasonably be, and give you **hands-on experience across cybersecurity domains** (AppSec, SAST/DAST, pen testing, vuln management, cloud, IAM, SOC/logging, IR, GRC) grounded in *real work you own and can demonstrate*.

**Last updated:** 2026-08-01  
**Stack in scope:** Expo/React Native client · FastAPI Face API · Supabase (Auth, Postgres + RLS, Storage) · GitHub Actions · EAS · Docker host (Fly/Railway)

**How this relates to other docs**

| Doc | Role |
|-----|------|
| `SPRINT_PLAN.md` | Feature + DevSecOps ownership per sprint |
| `ENVIRONMENTS.md` | Env separation, secrets, RLS advisor notes |
| `MVP_EARLY_DEPLOYMENT.md` | Ship-first checklist (security follow-up still required) |
| **This file** | Unified AppSec + cyber skill roadmap, threat model, resume outcomes, verification |

> **Honest scope:** One academy app will not make you a career SOC analyst or red-teamer by itself. It *will* let you practice the **same workflows** those roles use — scan → triage → fix → retest → detect → respond — with portfolio evidence. Pair this with a free SIEM lab (e.g. Elastic/Wazuh) or TryHackMe/HTB for depth where the app cannot go.

---

## 1. Why this project is a strong AppSec resume story

Most student projects stop at “I added login.” This app has **high-signal assets**:

- **Biometric-adjacent data** — face embeddings + enrollment photos in transit
- **Multi-tenant-ish RBAC** — coaches, admins, pending/suspended states, branch scoping
- **Sensitive academy PII** — students, parents, phones, fees/invoices
- **Privileged backend** — Face API using service-role key (bypasses RLS → *must* enforce authz in code)
- **Mobile + API + DB** — three attack surfaces you can harden and *measure*

Resume framing (use after you complete the phases below):

> Designed and executed an AppSec program for a coach-facing academy mobile app: threat-modeled biometric attendance and fee data, enforced JWT + object-level authorization on a FastAPI face pipeline, hardened Supabase RLS/RPC grants, and automated SAST/dependency/DAST checks in CI.

---

## 2. Current security posture (baseline)

### Already in place (keep / prove)

| Control | Evidence | Status |
|---------|----------|--------|
| Coach JWT on Face API routes | `server/main.py` `_require_coach` / `_require_admin` | Done |
| Client forwards Bearer token | Enroll + attendance client libs | Done |
| RLS on public tables + coach status gates | Migrations + `scope.md` | Done |
| Sprint 0 advisor remediation | `20260707120000_security_advisor_sprint0.sql` | Applied |
| Admin RPCs revoked from anon/authenticated | Same migration | Applied |
| Storage list policy removed on auth photos | Same migration | Applied |
| Dependabot | `.github/dependabot.yml` | Done |
| CI lint/typecheck/compile | `.github/workflows/ci.yml` | Partial (no SAST yet) |
| ZAP baseline script | `scripts/zap-baseline.sh` | Script only — not run regularly |
| Import audit log migration | `import_audit_log` migration | In repo |

### Critical open gaps (fix first)

| Gap | Risk | Primary owner |
|-----|------|---------------|
| AuthN without object-level AuthZ on `/enroll` & `/check-attendance` | Any approved coach can act on any `student_id` | AI code + you verify |
| `DEBUG_ENROLL_IMAGES` defaults toward on | Face images on disk in non-dev | You (host env) + code default |
| No upload size/MIME limits | DoS / CPU burn on face endpoints | AI code |
| No Face API audit trail | Cannot investigate abuse | AI + migration |
| `student_auth` / embeddings exposure via client | Direct embedding read/write | Migration + advisor |
| Shared Supabase project for “all envs” | Staging tests can hit real data | You (plan cutover) |
| Leaked-password protection off | Credential stuffing | You (Dashboard, ~1 min) |
| No WAF / host rate limits | Abuse of face endpoints | You |
| Staging/prod HTTPS API deploy incomplete | Cleartext / MITM on LAN-style URLs | You |
| CI has no security jobs | Regressions merge unnoticed | You + AI scaffold |

---

## 3. Threat model (keep this short and living)

### Assets

1. Coach/admin sessions (Supabase JWT)
2. Student PII + fee/invoice records
3. Face embeddings (`student_auth`) and enrollment images in transit/on disk
4. Service-role / secret API keys
5. CSV import path (bulk write of academy data)
6. Storage objects (photos/media)

### Trust boundaries

```
[Coach device] --HTTPS--> [Expo app]
       | anon key + user JWT
       v
[Supabase Auth + Postgres RLS + Storage]
       |
       | coach JWT + photo upload
       v
[Face API] --service_role--> [Supabase]   ← RLS bypassed here
```

**Rule of thumb:** Anything the Face API does with the service-role key is **your application’s responsibility**. RLS will not save you on those paths.

### Top threats (STRIDE-lite)

| Threat | Example | Mitigations (this plan) |
|--------|---------|-------------------------|
| Spoofing | Stolen JWT, leaked anon misuse | Short sessions, leaked-password protection, HTTPS, revoke suspended coaches |
| Tampering | Forge attendance, edit fees via RPC | Object-level checks, admin-only routes, RPC grant hygiene |
| Repudiation | “I didn’t enroll that face” | `face_api_audit_log`, import audit |
| Information disclosure | List storage bucket, read embeddings, verbose errors | Storage policies, RLS on `student_auth`, no debug images in prod, safe error messages |
| Denial of service | Huge uploads, spam enroll | Size limits, rate limits, WAF |
| Elevation of privilege | Non-admin import/coach create; coach A → student of coach B | Admin gates, scope checks, branch/batch membership |

### Out of scope for v1 (document honestly)

- Formal third-party pen test (optional Phase E)
- Hardware-backed attestation / cert pinning
- On-device-only embeddings (photo never leaves phone)
- Full SOC2 / HIPAA (academy software ≠ healthcare unless you market it that way)

---

## 4. Security principles for this codebase

1. **Defense in depth** — UI hide ≠ security; enforce in API *and* RLS.
2. **Least privilege** — anon key for client; service-role only on server; revoke dangerous RPCs.
3. **Fail closed** — missing/invalid token → 401; out of scope → 403; never 200 with empty trust.
4. **No secrets in git / mobile binaries beyond publishable keys** — service-role never in Expo.
5. **Biometric hygiene** — minimize retention; debug images off in staging/prod; audit without storing pixels.
6. **Measure** — advisor exports, ZAP reports, CI gates, written pen-test notes.

---

## 5. Phased AppSec roadmap

Complete phases in order. Each phase has **implementation**, **verification**, and **resume artifact**.

### Phase A — Close the blast radius ★ highest ROI

**Goal:** Stop the worst realistic attacks before more coaches use real photos.

| # | Work item | Done when |
|---|-----------|-----------|
| A1 | Enable **leaked password protection** in Supabase Auth | Dashboard toggle on |
| A2 | Object-level auth on `/enroll` + `/check-attendance` | Out-of-scope `student_id` → **403** |
| A3 | Upload limits (≤5 MB; jpeg/png/webp) | Oversize → 413; bad type → 400 |
| A4 | `DEBUG_ENROLL_IMAGES` off by default / in `.env` | No debug image growth |
| A5 | `student_auth` RLS — no client read/write of embeddings | Advisor + client JWT test |
| A6 | `face_api_audit_log` + server writes (no image bytes) | Rows after enroll/attendance |
| A7 | Cleartext only in development EAS profile | preview/production HTTPS-only config |
| A8 | Re-run Security Advisor; save export | Diff vs prior CSV |

**Maps to:** Sprint 0 leftover + Sprint 0.5 in `SPRINT_PLAN.md`.  
**Resume artifact:** “AuthZ bypass closed — before/after curl evidence.”

---

### Phase A — Learning-optimized runbook (do this version)

**Principle:** You do work that teaches security judgment. AI does repetitive wiring you would not explain in an interview. After every AI assist, you must be able to **teach back** the security idea in one sentence.

#### What YOU do (high learning — do not outsource)

| Skill you practice | Phase A task |
|--------------------|--------------|
| Product security ops | A1 Dashboard toggle |
| **AuthZ design** | Design + write the scope-check logic (who may act on which student/batch) |
| Secure file upload thinking | Decide limits + reject behavior; implement or co-write the validator |
| **RLS / least privilege** | Write (or heavily edit) the `student_auth` + audit-log SQL policies |
| Apply & verify migrations | Run SQL in Dashboard; confirm with queries |
| **IDOR / negative testing** | Design and run curl cases; interpret 401 vs 403 vs 400 vs 413 |
| Biometric hygiene | Set `DEBUG_ENROLL_IMAGES=0`; explain why default-on is dangerous |
| Mobile transport config | Decide when cleartext is allowed; set `eas.json` `APP_VARIANT` |
| Advisor triage | Re-run Security Advisor; classify new vs accepted findings |
| Evidence / storytelling | Fill `SECURITY_AUDIT.md` with commands + results |

#### What AI may do (low learning — save time)

| Task | Why AI is fine |
|------|----------------|
| Duplicate `formData.append("batch_id")` across nearly identical screens | Mechanical; you still verify one screen |
| Boilerplate FastAPI signatures, imports, `JSONResponse` helpers | Not interview material once you’ve seen one |
| Scaffold empty migration filename / table DDL skeleton | You own the **POLICY** and GRANT lines |
| First draft of `server/SECURITY.md` from your bullet notes | You supply the threat bullets |
| Fix typos / wire `GET /health` | Trivial once you know it must exist |

#### What to do as a pair (best learning mode)

1. **You** write a 5-line design note first (e.g. “enroll requires student in batch_members and active”).
2. **AI** implements from your note (or you implement and AI only reviews).
3. **You** explain the diff out loud / in `SECURITY_AUDIT.md` — if you can’t, re-read until you can.
4. **You** run negative tests. AI does not “verify” for you.

---

### Phase A — Exact steps (learning split)

Work top to bottom. Time box: **4–6 hours** if finishing Phase A in one day.

#### Step 0 — Open your evidence file (YOU · 5 min)

Create `SECURITY_AUDIT.md`:

```markdown
# Security Audit — Phase A
Date: YYYY-MM-DD

## Teach-backs (one sentence each)
- AuthN vs AuthZ:
- Why Face API needs app-layer AuthZ:
- Why embeddings must not be client-readable:

## Checklist
- [ ] A1 … A8
```

#### Step 1 — A1 Leaked passwords (YOU · 2 min) ★ learn: Auth hygiene

Supabase → Authentication → Providers → Email → enable **Leaked password protection** → save.  
Check A1. No AI needed.

#### Step 2 — Design AuthZ before any code (YOU · 15–20 min) ★ learn: threat → control

In `SECURITY_AUDIT.md`, write **your** rules (edit until true for this app):

```text
/enroll requires:
  - valid coach JWT (AuthN) — already exists via _require_coach
  - student_id exists and is active
  - student_id is a member of batch_id
  - else 403

/check-attendance requires: same as enroll for student_id + batch_id
  - face match is separate from AuthZ

Upload: max 5MB; image/jpeg|png|webp only; else 400/413
Debug images: off unless DEBUG_ENROLL_IMAGES=1
Audit: log coach, action, student_id, batch_id, success — never image bytes
```

Do **not** skip this. This is the interview story.

#### Step 3 — Implement A2 + A3 in the Face API (YOU primary · 60–90 min)

**You write** (or type with autocomplete only):

1. `_require_coach_can_act_on_student(token, student_id, batch_id)` in `server/main.py`
   - Query `batch_members` (and student active flag) using the **service** client or an RPC — understand which and why
   - Raise `HTTPException(403)` when out of scope
2. Call it from `/enroll` and `/check-attendance` **after** `_require_coach`, **before** face processing
3. Add `batch_id: str = Form(...)` to `/enroll`
4. Upload guard: read size / content-type (or sniff); reject before `face_recognition`

**Ask AI only if stuck**, with a narrow prompt:  
“Review my scope helper for IDOR gaps — don’t rewrite unless broken.”

**AI may:** add `batch_id` to client `FormData` in `Add_Student.tsx` / `AddStudentScreen.tsx` after you say “mirror attendance.”  
**You still open one file** and confirm `batch_id` is sent.

#### Step 4 — A4 Debug images (YOU · 10 min) ★ learn: data minimization

1. In code: default `DEBUG_ENROLL_IMAGES` to **off** when unset (change `"1"` → `"0"`).
2. In `server/.env`: `DEBUG_ENROLL_IMAGES=0`
3. Delete local `server/debug_enroll/*` if any
4. Restart uvicorn  
Teach-back: “Why is default-on dangerous on a shared laptop or staging host?”

#### Step 5 — A5 + A6 SQL (YOU write policies · 45–75 min) ★ learn: RLS

**AI may** paste a DDL skeleton for `face_api_audit_log` (columns only).

**You must write/decide:**

- `ENABLE ROW LEVEL SECURITY`
- Policies: `authenticated` / `anon` → **no** SELECT/INSERT/UPDATE/DELETE on `face_embedding` paths
- `GRANT` / `REVOKE` so only `service_role` (Face API) writes embeddings + audit rows
- Whether coaches need *any* access to `student_auth` metadata without embeddings (prefer: no client access)

Save as:

`supabase/migrations/YYYYMMDDHHMMSS_phase_a_student_auth_rls_and_face_audit.sql`

**YOU apply** in Supabase SQL Editor (or CLI). Applying teaches “migrations are prod.”  
Verify with:

```sql
select to_regclass('public.face_api_audit_log');
select polname from pg_policy where polrelid = 'public.student_auth'::regclass;
```

#### Step 6 — Wire audit writes (YOU · 20–30 min)

After successful/failed AuthZ and enroll/attendance, insert into `face_api_audit_log` (no bytes).  
If syntax is slow, AI can show **one** example insert — you copy the pattern to the other paths yourself.

#### Step 7 — Negative tests (YOU only · 45–60 min) ★ learn: pen-test lite

AI must **not** run or interpret these for you.

```powershell
$API = "http://127.0.0.1:8000"
$TOKEN = "<coach-jwt>"
```

| Test | Expect | Teaches |
|------|--------|---------|
| POST `/enroll` no token | 401/422 | AuthN |
| Valid token + student **not** in batch | **403** | AuthZ / IDOR |
| Valid token + student **in** batch + bad photo | 400 (face), not 403 | AuthZ vs validation |
| `text/plain` file | **400** | Upload allowlist |
| Optional >5MB file | **413** | DoS control |
| GET `/health` | **200** no auth | Ops health vs attack surface |

Then SQL: `select * from face_api_audit_log order by created_at desc limit 20;`  
Client with coach JWT: `from('student_auth').select('face_embedding')` → must fail/empty.

Paste **every** status code into `SECURITY_AUDIT.md`.

#### Step 8 — A7 Cleartext (YOU decide · 15–20 min) ★ learn: mobile transport

1. Read current `client/app.config.js` `usesCleartextTraffic` logic — find the loophole (`undefined` / non-EAS local prod).
2. **You** change it so cleartext is **only** when `APP_VARIANT === 'development'`.
3. **You** add to `client/eas.json`:

```json
"development": { "env": { "APP_VARIANT": "development" } },
"preview": { "env": { "APP_VARIANT": "preview" } },
"production": { "env": { "APP_VARIANT": "production" } }
```

AI may only confirm operator precedence if you’re unsure — you make the edit.

#### Step 9 — A8 Advisor (YOU · 15 min) ★ learn: vuln triage

Advisors → Security → export CSV as `supabase-warning-phaseA-YYYYMMDD.csv`.  
In audit notes: list any new HIGH/CRITICAL and **accept or fix** with a one-line rationale.

#### Step 10 — Teach-back gate (YOU · 10 min)

Fill the three teach-back sentences at the top of `SECURITY_AUDIT.md`.  
If any is weak, re-read the trust-boundary diagram in §3 before marking Phase A done.

---

### Phase A — “Stuck” prompts (narrow — preserves learning)

Use these instead of “implement all of Phase A”:

1. “I designed this AuthZ rule: \[paste\]. Point out IDOR holes only.”
2. “Here’s my RLS draft: \[paste SQL\]. What can `authenticated` still read?”
3. “Show one example audit insert; I’ll replicate.”
4. “Add `batch_id` to enroll FormData in the two Add Student screens only.”

Avoid: “Implement Phase A for me end-to-end” — that burns the learning.

---

### Phase B — Edge, transport, and secrets (3–5 days)

**Goal:** Production-shaped deployment posture — HTTPS API, edge abuse controls, secrets hygiene, and a written prod-DB cutover plan.

| # | Work item | Done when |
|---|-----------|-----------|
| B1 | Face API on HTTPS (Fly/Railway) with health check | `GET /health` 200; no HTTP in preview/prod |
| B2 | Cloudflare (or host WAF) in front of API | TLS + basic bot/rate rules |
| B3 | Host rate limits on `/enroll` and `/check-attendance` (start 20–30/min/IP) | Documented thresholds + 429 evidence |
| B4 | Secrets hygiene checklist: rotate if ever pasted in chat; EAS secrets per profile; server env only | Written checklist in `ENVIRONMENTS.md` |
| B5 | Plan **prod Supabase project** cutover (even if later) | Runbook exists |
| B6 | Branch protection: require CI on PRs to `main`/`cursor` | GitHub setting on |
| B7 | Confirm no service-role in client bundle / Expo config | Grep + EAS secret audit |

**Maps to:** Sprint 8 deploy slice + `ENVIRONMENTS.md` staging/prod rows.  
**Resume artifact:** Architecture diagram (client → WAF → API → Supabase) + secrets matrix.  
**Evidence file:** Continue in `SECURITY_AUDIT.md` under **Phase B**.

---

### Phase B — Learning-optimized runbook (do this version)

**Principle:** You do work that teaches cloud / transport / secrets judgment. AI may scaffold Dockerfiles, health endpoints, or rate-limit middleware after **you** write the design note. After every AI assist, you must be able to **teach back** the security idea in one sentence.

#### What YOU do (high learning — do not outsource)

| Skill you practice | Phase B task |
|--------------------|--------------|
| **Threat → deploy control** | B0 design: HTTPS, edge, rate limits, secrets rules |
| Cloud / platform ops | B1 create host, set secrets, deploy, verify TLS |
| Edge / network security | B2 put WAF or platform edge rules in front of origin |
| Abuse / DoS thinking | B3 choose thresholds; prove 429; document in `ENVIRONMENTS.md` |
| **Secret management** | B4 inventory + matrix; rotate anything leaked |
| Env separation / GRC-lite | B5 write prod Supabase cutover runbook (even if deferred) |
| Secure SDLC hygiene | B6 turn on branch protection + required CI |
| Mobile binary hygiene | B7 grep client + audit EAS secret *names* |
| Evidence / storytelling | Fill Phase B sections in `SECURITY_AUDIT.md` |

#### What AI may do (low learning — save time)

| Task | Why AI is fine |
|------|----------------|
| Stub `GET /health` once you specify “200 JSON, no auth, no secrets” | Mechanical; you verify deploy health checks |
| First draft Dockerfile / Procfile from your chosen host docs | You still run build + set secrets |
| Scaffold `slowapi` / middleware boilerplate after you pick limits | You own the numbers and where enforced |
| Formatting help for secrets checklist tables | You fill every row |
| Draw mermaid architecture from your notes | You explain the trust boundaries |

#### What to do as a pair (best learning mode)

1. **You** write the B0 design note (HTTPS URL plan, rate numbers, secrets rules).
2. **AI** implements scaffolding from your note (health, rate limit wiring, Dockerfile).
3. **You** deploy, set host secrets, and run smoke tests — AI does not “verify” for you.
4. **You** explain the architecture out loud / in `SECURITY_AUDIT.md`.

---

### Phase B — Exact steps (learning split)

Work top to bottom. Time box: **3–5 days** part-time (or one focused weekend + follow-ups).

#### Step 0 — Open Phase B evidence (YOU · 5 min)

In `SECURITY_AUDIT.md`, start the **Phase B** header table and checklist (B0–B7). Fill teach-back blanks only after you finish.

#### Step 1 — B0 Design before deploy (YOU · 20–30 min) ★ learn: threat → control

Write **your** contract in `SECURITY_AUDIT.md` B0 (edit until true for this app):

```text
Staging Face API:
  - HTTPS only for preview/production mobile builds
  - GET /health → 200, unauthenticated
  - DEBUG_ENROLL_IMAGES=0 on host
  - SUPABASE_KEY only on host env (never Expo / git)

Rate limits (starting point):
  - /enroll: 20–30 / min / IP
  - /check-attendance: 20–30 / min / IP
  - reject with 429
  - enforce in app and/or edge

Secrets:
  - anon/publishable → client + EAS OK
  - service-role → server only
  - rotate anything pasted in chat

Prod Supabase cutover: new project → migrations → bootstrap → point production EAS + prod API
```

Do **not** skip this. This is the interview story for “how I hardened transport and secrets.”

#### Step 2 — B1 HTTPS Face API + `/health` (YOU primary · 2–4 hr) ★ learn: cloud deploy

**You decide / do:**

1. Pick host: **Fly.io** or **Railway** (or Render/VPS — record why).
2. Ensure `GET /health` exists in `server/main.py` (200, no auth, no key material in body).
3. Build/run container or platform build from `server/`.
4. Set host secrets: `SUPABASE_URL`, `SUPABASE_KEY` (service-role/secret), `DEBUG_ENROLL_IMAGES=0`.
5. Confirm public URL is `https://…`.
6. Point **preview** EAS `EXPO_PUBLIC_API_BASE_URL` at that HTTPS URL (not LAN HTTP).
7. Smoke: `curl https://…/health` → 200; `POST /enroll` without token → 401/422.

**Ask AI only if stuck**, narrow prompts:  
“Review my `/health` handler — must not leak env or stack traces.”  
“Here’s my Dockerfile draft for FastAPI + face_recognition — what will break on Fly?”

**AI must NOT:** create your cloud account, paste your real `SUPABASE_KEY` into chat, or mark B1 done without your curl evidence.

Record URL (hostname only is fine) + proof in `SECURITY_AUDIT.md` B1.

#### Step 3 — B2 Edge / WAF (YOU · 45–90 min) ★ learn: network edge

1. Prefer **Cloudflare** in front of the API hostname, **or** enable the host’s built-in WAF/rate features if Cloudflare is overkill for now.
2. Use **Full (strict)** TLS to origin when certificates allow — never leave “Flexible” on a real API.
3. Enable at least one concrete rule: bot fight / rate limiting / managed WAF — write the rule name in the audit.
4. Teach-back: “Why shouldn’t the Face API be a naked origin?”

If you defer Cloudflare, document **why** and which **host-native** control substitutes — do not silently skip.

#### Step 4 — B3 Rate limits (YOU design numbers · 45–75 min) ★ learn: DoS control

**You choose** the thresholds (start **20–30/min/IP** on `/enroll` and `/check-attendance`).

**You implement or co-write:**

1. App-layer limiter (e.g. SlowAPI / custom middleware) **and/or** edge rate rule.
2. Return **429** when exceeded.
3. Document final numbers in `ENVIRONMENTS.md` + `SECURITY_AUDIT.md` B3.

**AI may** paste one middleware example after you specify routes + limits — you wire both face routes and retest.

**YOU only** run a short burst test (do not hammer free-tier shared infra). Paste status codes into the audit.

Teach-back: “How do upload size limits (A3) and rate limits (B3) complement each other?”

#### Step 5 — B4 Secrets hygiene (YOU · 30–45 min) ★ learn: IAM / secret mgmt

1. Write a checklist in `ENVIRONMENTS.md` (inventory → locations → rotate-if-leaked → owners).
2. Fill the **secrets matrix** in `SECURITY_AUDIT.md` B4 (**names only**, never values).
3. Confirm EAS secrets per profile for `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_BASE_URL`.
4. Rotate any secret that ever appeared in chat, screenshots, or CI logs **before** checking B4 done.

No AI “rotation” — you click Dashboard / host UI yourself.

#### Step 6 — B5 Prod Supabase cutover runbook (YOU · 30–45 min) ★ learn: env separation

Even on free tier (one project today), write the launch runbook:

1. Create `mccc-prod` (later) → apply all `supabase/migrations/` → bootstrap admin.
2. Point **prod** Face API host + **production** EAS profile at prod only.
3. Re-purpose shared project as staging/dev — document “do not wipe prod.”

Paste the step table into `SECURITY_AUDIT.md` B5 and a short section in `ENVIRONMENTS.md`.

**Gate:** Runbook exists. Creating the second project can wait until paid plan / launch.

#### Step 7 — B6 Branch protection (YOU · 10–15 min) ★ learn: secure SDLC

GitHub → Settings → Branches → protect `main` (and `cursor` if you merge there):

- Require a pull request before merging (recommended).
- Require status checks to pass (your existing `ci.yml` job names).
- Optionally: do not allow bypass for admins (stricter).

Evidence: settings note or screenshot (no tokens) in audit B6.

#### Step 8 — B7 No service-role in client (YOU · 20–30 min) ★ learn: mobile secret hygiene

```powershell
# from repo root — summarize paths only; never paste key material into the audit
rg -n "service_role|SUPABASE_KEY|sb_secret" client/ --glob "!**/node_modules/**"
```

Also read `client/app.config.js` `extra` and list EAS secret **names** for mobile profiles.  
If anything secret-shaped appears in the client tree: **remove → rotate → rebuild** before sign-off.

#### Step 9 — Architecture + teach-back gate (YOU · 15–20 min)

1. Fill the Phase B trust-path diagram / checkpoint table in `SECURITY_AUDIT.md`.
2. Answer T1–T5 teach-backs in your own words.
3. Mark Phase B checklist + sign-off.

---

### Phase B — “Stuck” prompts (narrow — preserves learning)

Use these instead of “do all of Phase B for me”:

1. “I designed this deploy contract: \[paste B0\]. Point out gaps only (HTTPS, secrets, health).”
2. “Here’s my `/health` handler: \[paste\]. Any info leak?”
3. “Show one SlowAPI (or middleware) example for 30/min on `/enroll`; I’ll copy to `/check-attendance`.”
4. “Review my secrets matrix table for wrong placements (anon vs service-role).”
5. “Draft Dockerfile comments for Fly/Railway from this host choice: \[Fly|Railway\] — I will run deploy.”

Avoid: “Deploy Phase B end-to-end and set my secrets” — that burns the learning and risks leaking keys into chat.

---

### Phase C — Secure SDLC: SAST, SCA, secrets, DAST in CI (1–2 weeks)

**Goal:** You can explain and *operate* static analysis, dependency scanning, secret detection, and dynamic testing — not just name the acronyms.

| # | Work item | Domain | Tooling | Done when |
|---|-----------|--------|---------|-----------|
| C1 | **SCA** (Software Composition Analysis) | Vuln mgmt | Dependabot (have) + CI `npm audit` / `pip-audit` | Critical CVEs fail PR or have documented exception |
| C2 | **SAST** | AppSec / DevSecOps | GitHub CodeQL **and/or** Semgrep (`p/owasp-top-ten`, Python FastAPI rules) | Finding opened → fixed → retest green |
| C3 | **Secret scanning** | DevSecOps | GitHub secret scanning + push protection; optional `gitleaks` pre-commit | Enabled; one intentional test secret caught then removed |
| C4 | AuthZ unit / integration tests | AppSec | pytest against Face API auth helpers | CI fails if 401/403 regressions |
| C5 | **DAST** baseline | AppSec / QA | OWASP ZAP via `scripts/zap-baseline.sh` | Report triaged in `SECURITY_AUDIT.md` |
| C6 | **DAST** authenticated / API scan | Pen test lite | ZAP OpenAPI or manual scripted scan with coach JWT (staging only) | Auth-bypass + header findings logged |
| C7 | `SECURITY.md` + `server/SECURITY.md` | GRC-lite | Reporting contact, threat summary | Merged |
| C8 | Vuln triage SOP | Vuln mgmt | Severity, SLA (e.g. Critical 7d), owner | Written in `SECURITY_AUDIT.md` |

**Resume artifact:** Screenshot of CI jobs (SAST + SCA + secrets) + one SAST finding you fixed + ZAP before/after.

**Interview line:** “I wired SAST (CodeQL/Semgrep), SCA (Dependabot/pip-audit), secret scanning, and DAST (OWASP ZAP) into the pipeline, then triaged and remediated findings with a simple SLA.”

---

### Phase D — Data-plane and feature security (ongoing with features)

Align with feature sprints so security is not a bolt-on.

| Feature area | Controls to ship with the feature |
|--------------|-----------------------------------|
| Fees dashboard | RLS on invoices/payments; coach JWT smoke; no cross-branch leak |
| CSV import | Admin-only; dry-run; size limits; audit who/when/counts; staging-first |
| Coach attendance | Same AuthZ patterns as student attendance |
| Student portal (Sprint 5–6) | Separate role; student can only read own rows; Storage signed URLs; IDOR tests student A vs B |
| Multi-academy (later) | `academy_id` tenant isolation; never share service-role across tenants carelessly |

**IDOR test pack (run after each major feature):**

1. Coach A token + Coach B resource IDs → expect deny.
2. Non-admin token on `/admin/*` and import → **403**.
3. Suspended coach → **403** everywhere protected.
4. Anon key alone → cannot call admin RPCs or read embeddings.
5. Student JWT (when exists) → cannot read other students’ fees/attendance/media.

---

### Phase E — Penetration testing (manual + tooling) (1–2 weeks)

**Goal:** Practice a real (scoped) pen-test lifecycle on **your staging** system — plan → recon → exploit attempt → report → retest. This is red-team *lite*, not a drive-by of random internet hosts.

**Rules of engagement (write these down before you start)**

- Target = **staging Face API + shared Supabase only** (never random third parties).
- No DoS that could take down shared free-tier resources beyond brief rate-limit tests.
- No exfiltrating real student PII into your portfolio — use synthetic test students.
- Stop and document when you hit a Critical; fix before continuing spray-and-pray.

| # | Work item | Domain | How | Done when |
|---|-----------|--------|-----|-----------|
| E1 | Scope & ROE one-pager | Pen test | Assets, accounts, out-of-scope, time box | In `SECURITY_AUDIT.md` |
| E2 | Recon | Pen test | Enumerate routes (`/docs` if exposed — then disable in prod), methods, auth schemes | Notes |
| E3 | AuthN attacks | Pen test | No token, bad JWT, expired JWT, replay | Expected 401s documented |
| E4 | AuthZ / IDOR | Pen test | Coach A→B resources; admin routes as coach; anon RPCs | Pass/fail table |
| E5 | Injection & input | Pen test | Oversized upload, wrong MIME, CSV formula injection in import, weird Unicode IDs | Rejected safely |
| E6 | Config / info leak | Pen test + DAST | Verbose errors, stack traces, open `/docs`, missing security headers (ZAP) | Triaged |
| E7 | Mobile surface | Mobile AppSec | Proxy staging API with mitmproxy/Charles (dev build); confirm tokens not logged; HTTPS only | Notes |
| E8 | Tool-assisted | DAST / pen | ZAP baseline + optional Nuclei templates against staging API | Reports saved (gitignored) |
| E9 | Report | Pen test | Findings with severity, steps, impact, fix, evidence | `SECURITY_AUDIT.md` or PDF |
| E10 | Retest | Pen test | Re-run failed cases after fixes | “Closed” status |

**Optional stretch (extra resume color):** Invite a classmate under the same ROE; you act as blue team while they attack (purple-team exercise).

**Resume artifact:** Redacted pen-test report with 3–5 findings (at least one you found *and* fixed).

---

### Phase F — Blue team / SOC-lite: logging, detection, response (1–2 weeks)

**Goal:** Practice defender workflows — what would a SOC look for if this academy were a customer?

You will not run Splunk Enterprise on this app alone. You **will** build logging + alerts + an IR playbook that map 1:1 to SOC skills.

| # | Work item | Domain | How on this project | Done when |
|---|-----------|--------|---------------------|-----------|
| F1 | Security event taxonomy | SOC / logging | Define events: `auth.fail`, `authz.deny`, `enroll.ok/fail`, `attendance.ok/fail`, `admin.coach_create`, `import.commit`, `rate_limit.hit` | List in `server/SECURITY.md` |
| F2 | Structured app logs | Logging | Face API: JSON logs (timestamp, level, event, coach_id hash, route, status, ip) — **no** image bytes, no raw JWT | Deployed on staging |
| F3 | Audit tables as “detections source” | Detection | Query `face_api_audit_log` + import audit for spikes / cross-student patterns | 2 example SQL detections documented |
| F4 | Host / edge telemetry | Cloud / SOC | Cloudflare or Fly metrics: 4xx/5xx, rate-limit blocks; save weekly screenshot | In portfolio |
| F5 | Alerting (minimal SIEM) | SOC | Pick **one**: (a) Cloudflare email/webhook on spike, (b) GitHub Action that curls health + fails on anomaly, (c) free Elastic/Wazuh ingest of API logs | At least one alert you triggered on purpose |
| F6 | Detection → investigate drill | SOC | Simulate: 50 authz.deny from one IP → look up logs → decide block/rotate | Write-up “alert → triage → action” |
| F7 | Incident response playbook | IR | 1-pager: stolen coach account, leaked service-role, debug images left on, ransomware of laptop with `.env` | In repo or portfolio |
| F8 | Key rotation drill | IR / IAM | Rotate a non-prod secret; update host; verify app; document time taken | Notes |
| F9 | Suspended coach enforcement | IAM / IR | Suspend test coach → confirm API + RLS deny | Pass |

**Free SOC lab add-on (highly recommended for interviews):** Stand up Wazuh or Elastic locally, ship Face API JSON logs for a weekend, write 2 detection rules. Say: “App emits detections; lab SIEM consumes them.”

**Resume artifact:** IR playbook + one detection drill write-up + sample (redacted) structured log line.

---

### Phase G — Assurance & portfolio polish (3–5 days)

**Goal:** Package evidence for interviews.

| # | Work item | Output |
|---|-----------|--------|
| G1 | Privacy/ops: face consent + delete/re-enroll when student leaves | 1-page ops SOP |
| G2 | Metrics snapshot | Advisor warnings open, ZAP highs, MTT remediate Dependabot |
| G3 | Portfolio case study | Problem → threat model → SAST/DAST/pen/SOC → controls → proof |
| G4 | Optional external review | Classmate or cheap vuln scan note |

---

## 5b. Cybersecurity skill map (become well-rounded on *this* project)

Use this as your interview coverage checklist. **Do every row at least once** — shallow is fine if evidence exists.

| Domain | What you practice here | Concrete deliverable | Interview phrase |
|--------|------------------------|----------------------|------------------|
| **Threat modeling** | STRIDE on face + fees + import (§3) | Living threat model in this file | “I threat-modeled trust boundaries around a service-role API…” |
| **AppSec / secure design** | AuthZ, RLS, least privilege | Phase A controls | “Defense in depth: UI + API + RLS…” |
| **IAM / AuthN AuthZ** | Supabase Auth, coach roles, suspend | IDOR + suspend tests | “Broke out AuthN vs object-level AuthZ…” |
| **SAST** | CodeQL / Semgrep in CI | Phase C2 | “Fixed a SAST finding and prevented regression in CI…” |
| **SCA / vuln management** | Dependabot, pip-audit, SLA | Phase C1 + C8 | “Triaged CVEs with severity and fix SLA…” |
| **Secret management** | EAS secrets, no service-role in app, gitleaks | Phase B4 + C3 | “Separated publishable vs secret keys…” |
| **DAST** | OWASP ZAP baseline + auth scan | Phase C5–C6 | “Ran authenticated DAST against staging API…” |
| **Penetration testing** | Scoped ROE, IDOR, upload abuse, report | Phase E | “Executed a time-boxed pen test and retested fixes…” |
| **Mobile security** | Cleartext off, token handling, proxy lab | Phase A7 + E7 | “Verified TLS and token hygiene on the mobile client…” |
| **Cloud / platform security** | Supabase advisor, Storage policies, Fly HTTPS | Phase A/B + advisor | “Hardened BaaS RLS and storage exposure…” |
| **Network / edge** | WAF, TLS, rate limits | Phase B | “Put the API behind edge rate limiting…” |
| **Logging & monitoring** | Structured security events | Phase F1–F2 | “Defined a security event taxonomy and JSON logs…” |
| **Detection / SOC-lite** | Audit SQL, alerts, triage drill | Phase F3–F6 | “Wrote detections and practiced alert triage…” |
| **Incident response** | Playbooks + key rotation drill | Phase F7–F8 | “Ran a secret-leak IR tabletop with rotation…” |
| **Privacy / GRC-lite** | Consent, retention, SECURITY.md | Phase G + C7 | “Documented biometric retention and reporting…” |
| **Purple team** | Optional classmate attack vs your detections | Phase E stretch + F6 | “Attacker findings fed blue-team detections…” |
| **Red team depth** *(supplement)* | Not fully on this app | TryHackMe/HTB + apply lessons back | “I deepen exploit skills in labs; apply methodology here…” |
| **Enterprise SOC depth** *(supplement)* | Not fully on this app | Wazuh/Elastic home lab ingesting your API logs | “App is the log source; lab is the SIEM…” |

### SAST vs DAST vs pen test vs SOC (know the differences cold)

| Practice | When | What it finds | Your tool on this project |
|----------|------|---------------|---------------------------|
| **SAST** | In CI, on code | Insecure patterns, some injection, hardcoding | CodeQL / Semgrep |
| **SCA** | In CI / Dependabot | Vulnerable libraries | npm audit, pip-audit, Dependabot |
| **DAST** | Against running staging | Misconfig, headers, some auth issues, crawlable bugs | OWASP ZAP |
| **Pen test** | Time-boxed human (+ tools) | Business logic, IDOR, chained issues scanners miss | Your Phase E checklist + ZAP/Nuclei |
| **SOC / detection** | Continuously after deploy | Abuse *in progress* (brute force, mass 403s) | Structured logs + audit SQL + alerts |

Interviewers love when you say: **“Scanners find classes of bugs; pen tests find business-logic abuse; SOC catches what slipped into production.”**

---

## 6. Control catalog (what “most secure” means here)

Use this as a checklist. Target: **all P0/P1 before real-user staging with photos**.

### P0 — Must have before real biometrics / fees in staging

- [ ] Object-level AuthZ on face routes
- [ ] Upload size/type limits
- [ ] `DEBUG_ENROLL_IMAGES=0` on staging/prod
- [ ] HTTPS Face API for non-dev builds
- [ ] `student_auth` embeddings not client-readable
- [ ] Leaked password protection on
- [ ] Admin RPCs not executable by anon
- [ ] No service-role in mobile app

### P1 — Must have before broader coach rollout

- [ ] Face API audit log
- [ ] Host rate limits + WAF/edge
- [ ] Branch protection + Dependabot triage habit
- [ ] Import admin-only + audit
- [ ] Security Advisor clean of new CRITICAL/HIGH (accepted lows documented)
- [ ] ZAP DAST baseline run + triage
- [ ] Cleartext disabled in preview/production

### P2 — Strong / resume differentiators (cyber well-rounded)

- [ ] CodeQL or Semgrep **SAST** in CI
- [ ] SCA gate (`npm audit` / `pip-audit`) + vuln SLA
- [ ] Secret scanning + push protection
- [ ] Automated authz regression tests
- [ ] Scoped **pen-test report** + retest (Phase E)
- [ ] Structured security **JSON logs** + event taxonomy (Phase F)
- [ ] At least one **detection/alert** you triggered and triaged
- [ ] **IR playbook** + key-rotation drill
- [ ] Separate prod Supabase project (or documented cutover runbook)
- [ ] Narrow DB role instead of full service-role (Face API)
- [ ] Student-portal IDOR suite
- [ ] Written privacy/consent process for face data

### P3 — Nice later / lab supplements

- [ ] Certificate pinning
- [ ] On-device embeddings
- [ ] Formal external pen test
- [ ] Wazuh/Elastic home lab ingesting Face API logs
- [ ] Nuclei template pack for your API
- [ ] Runtime RASP / advanced bot management
- [ ] Full ASVS L2 mapping spreadsheet

---

## 7. Verification playbook (commands you can show)

### AuthN

```bash
# Expect 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$API/enroll"
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$API/enroll" \
  -H "Authorization: Bearer invalid"
```

### AuthZ (scope)

```bash
# Coach A JWT + student_id belonging to another batch/coach → expect 403
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$API/check-attendance" \
  -H "Authorization: Bearer $COACH_A_JWT" \
  -F "student_id=$FOREIGN_STUDENT" -F "batch_id=$BATCH" -F "file=@photo.jpg"
```

### RLS / embeddings

In Supabase SQL or client with coach JWT only: attempt `select face_embedding from student_auth` → must fail or return nothing per policy.

### DAST

```bash
API_BASE_URL=https://your-staging-api ./scripts/zap-baseline.sh
```

### Pen-test evidence (Phase E)

Keep a table in `SECURITY_AUDIT.md`:

| ID | Finding | Severity | Status | Retest date |
|----|---------|----------|--------|-------------|
| PT-01 | Coach A can enroll Coach B student | Critical | Fixed | YYYY-MM-DD |

### SOC / logging spot-check (Phase F)

```bash
# After deploying structured logs: force a 401 and confirm event=auth.fail appears
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$API/enroll"
# Then inspect host logs / log drain for the JSON line (redact before portfolio)
```

### Advisor

Supabase → Advisors → Security → export CSV → compare to previous export.

Record results in `SECURITY_AUDIT.md` (create when you start Phase A).

---

## 8. Secure coding standards (for you + AI)

When adding any endpoint or query:

1. Identify the **actor** (anon / coach / admin / student / service).
2. Enforce **AuthN** then **AuthZ** (object + role).
3. Prefer **parameterized** queries / Supabase client; never string-build SQL with user input.
4. Validate **types, sizes, enums** at the boundary (Pydantic / form validators).
5. Log **security-relevant events** without PII dumps or image bytes.
6. Add a **negative test** (unauthorized actor) with the feature.
7. Update this plan’s checklist if you introduce a new trust boundary (e.g. webhooks, public links).

CSV import specifics:

- Admin JWT required
- Max file size + row cap
- Dry-run before commit
- Audit: actor, filename hash, counts, errors

Face API specifics:

- Never return embeddings to the client unless a future design requires it (prefer not)
- Strip EXIF if you ever persist images
- Timeouts on face processing to avoid hang DoS

---

## 9. Suggested calendar (12 weeks, part-time — well-rounded track)

| Week | Focus | Cyber domain | Outcome |
|------|-------|--------------|---------|
| 1 | Phase A (AuthZ, uploads, RLS, debug off) | AppSec / IAM | P0 mostly green |
| 2 | Phase B (HTTPS, WAF, rate limits) | Cloud / network | Staging hardened |
| 3–4 | Phase C (SAST, SCA, secrets, ZAP DAST) | DevSecOps / vuln mgmt | Pipeline story |
| 5–6 | Phase D with features (fees/import) | AppSec | IDOR notes |
| 7–8 | Phase E pen test + retest | Pen testing | Redacted report |
| 9–10 | Phase F logging, detections, IR drill | SOC / IR | Alert + playbook |
| 11 | Optional Wazuh/Elastic lab ingest | SOC depth | Lab SIEM screenshot |
| 12 | Phase G portfolio case study | GRC / storytelling | Interview-ready |

**Compressed 8-week path:** Weeks 1–3 as above, merge pen-test into week 5, SOC-lite into week 6–7, portfolio week 8. Do **not** skip Phase A.

Adjust: if you must ship MVP earlier, **do not skip Phase A**. Ship without Phase C if needed, but schedule SAST/DAST immediately after.

---

## 10. Resume & interview kit

### Bullet templates (fill in after evidence exists)

- Implemented **object-level authorization** on a FastAPI facial-recognition API so coaches cannot enroll or mark attendance for out-of-scope students (IDOR closed; verified with cross-coach tests).
- Hardened **Supabase Postgres**: RLS, revoked dangerous `SECURITY DEFINER` RPCs from `anon`, locked storage listing on biometric-related buckets.
- Built a DevSecOps pipeline: **SAST (CodeQL/Semgrep) + SCA (Dependabot/pip-audit) + secret scanning + DAST (OWASP ZAP)**; triaged findings with a written severity SLA.
- Executed a **scoped penetration test** (ROE, recon, AuthZ/IDOR, upload abuse, report, retest) against staging Face API and mobile client.
- Stood up **SOC-lite detections**: structured security event logs, audit-table queries, and an alert→triage→response drill; authored IR playbooks for credential leak and coach compromise.
- Designed controls for **biometric data minimization** (no prod debug image retention, audit logs without image payloads, HTTPS-only mobile profiles).

### Portfolio folder structure (suggested)

```
portfolio/mccc-appsec/
  threat-model.md
  before-after-authz.md
  ci-sast-sca-dast.png      # redacted CI screenshot
  zap-summary.md
  pentest-report-redacted.pdf
  detection-drill.md        # alert → investigate → action
  ir-playbook.md
  architecture.png
  (optional) siem-lab.png   # Wazuh/Elastic ingesting API logs
```

Do **not** publish real JWTs, service-role keys, student PII, or production URLs with open admin.

### Interview talking points

1. Why service-role on the Face API forced **app-layer AuthZ**.
2. Difference between **AuthN (Sprint 0)** and **AuthZ (Sprint 0.5 / Phase A)**.
3. **SAST vs DAST vs pen test vs SOC** — when each runs and what each catches (§5b).
4. How you prioritized biometric + IDOR over cosmetic header findings.
5. A finding you **accepted** with rationale (e.g. `vector` in `public` schema) — shows maturity.
6. Walk through one **detection drill**: what fired, how you investigated, what you changed.

---

## 11. Ownership matrix (learn vs save time)

**Rule:** If you would explain it in an interview, **you** do it (or write it first). If it is copy-paste wiring, **AI** may do it after you understand the pattern once.

| Area | YOU (learning) | AI (time-saver) |
|------|----------------|-----------------|
| Threat rules / AuthZ design notes | ✓ write first | Review for holes only |
| Scope helper + upload reject logic | ✓ implement | Unstick / review |
| Client `batch_id` FormData duplication | Verify one screen | ✓ mirror other screens |
| RLS / GRANT policies in SQL | ✓ write policies | DDL skeleton only |
| Apply migrations + advisor export | ✓ | — |
| Curl IDOR / negative tests + audit notes | ✓ | — |
| Dashboard toggles, EAS `APP_VARIANT`, secrets | ✓ | — |
| Phase B deploy design (B0) + rate numbers | ✓ write first | Review gaps only |
| HTTPS host secrets + smoke curls | ✓ deploy / verify | Dockerfile / `/health` stub |
| WAF / Cloudflare rules | ✓ enable + document | Explain TLS modes if stuck |
| Secrets matrix + rotation | ✓ | Table formatting only |
| Prod Supabase cutover runbook | ✓ write | — |
| Branch protection settings | ✓ | — |
| CI YAML scaffold (Phase C) | Enable + triage findings | ✓ first draft |
| Pen-test exec + SOC drills (later) | ✓ | Checklists only |
| Typos, doc formatting | Optional | ✓ |

---

## 12. Definition of “most secure we can be” (exit criteria)

You can claim a strong AppSec posture for this project when:

1. All **P0** and **P1** items in §6 are checked.
2. Phase A–C are complete with artifacts saved.
3. At least one full **IDOR pack** (§5 Phase D) is documented as passing on staging.
4. Security Advisor has **no unexplained CRITICAL/HIGH**.
5. You can walk through the trust-boundary diagram and name two residual risks you accept.

Residual risk will always exist (shared free-tier DB until cutover, service-role key compromise, social engineering of coaches). Document it; don’t pretend zero risk.

---

## 13. Immediate next actions (this week)

1. Finish any open Phase A boxes in `SECURITY_AUDIT.md` (A6–A8 teach-backs / sign-off if still blank).
2. Start **Phase B0** design note in `SECURITY_AUDIT.md` (HTTPS, rate limits, secrets rules).
3. Deploy Face API to HTTPS staging (`/health` + `DEBUG_ENROLL_IMAGES=0` on host).
4. Turn on **branch protection** requiring CI; write secrets checklist into `ENVIRONMENTS.md`.
5. When Phase B checklist is green, update this file’s P0/P1 boxes and move to Phase C (SAST/SCA/DAST).

When Phase A is done, keep Sprint 0.5 notes in `SPRINT_PLAN.md` in sync. When Phase B is done, record staging API hostname in `ENVIRONMENTS.md` “Recorded URLs.”
