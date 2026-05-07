# Feature-First Delivery Scope

## Progress at a glance

### Done (Supabase + DB — Feature 1)

- RLS enabled on all `public` tables.
- Role helpers tied to `auth.uid()` (`current_coach_id`, `has_coach_access`, `is_current_user_admin`, etc.).
- Replaced broad `authorized_full_access` with granular policies (`rw_approved_staff`, coach row admin-only writes, `coach_access_requests` policies).
- Coach access states enforced on `coaches.status`: `pending`, `approved`, `rejected`, `suspended` (check constraint + defaults).
- Only **approved** coaches (or approved admins) can access protected data per RLS.
- Admin-only path for coach record changes (trigger guard + policies).
- Initial admin bootstrap: your user mapped to `coaches` with `status = approved` and `is_admin = true` (so you are not locked out).
- `**coaches` schema finalized**: `status` is the single source of truth (no `access_status`); comments on table/columns.
- `**coaches` audit columns**: `approved_by`, `approved_at`, `created_at`, `updated_at` + `trg_coaches_set_updated_at`.
- `**coach_access_requests`**: review fields + FKs + status check + indexes + `applicant_note` + `updated_at` trigger + table/column comments (migration `coach_access_requests_metadata_indexes`).

### Done (outside this checklist — you confirmed)

- Google Auth provider enabled in Supabase Dashboard.
- At least one `auth.users` row (your account).

### Not done yet (next up)

- **Feature 2:** All coach/admin auth UI (Google sign-in in app, gates, request UI, admin queue, approve/reject, mobile).
- **Feature 3–5:** Student/fees DB, student/fees UI, QA.

---

## Phase 0 - Locked Product Rules

- Coaches get full edit access only after admin approval.
- Students can be in multiple batches and can also have separate 1:1 coaching.
- Custom-day selection uses fixed fee plans.
- Sibling discount applies monthly for all eligible boys.
- Registration + dress are charged once globally on first admission only.
- No payment gateway for now (manual payment records only).
- No student/parent login for now (internal admin/coach only).

## Feature 1 - Coach/Admin Authentication + Access Control (Database)

- Enable RLS on all public tables (completed).
- Add role-access framework tied to `auth.uid()` (completed).
- Replace temporary broad policies with least-privilege policies (completed).
- Define and enforce coach access states: `pending`, `approved`, `rejected`, `suspended` (completed).
- Ensure only approved coaches/admins can access app data (completed).
- Keep admin-only capability for approving/rejecting coach access (completed).
- Bootstrap initial approved admin mapping so project is not locked out (completed).

### Coach/Auth Database Remaining

- Finalize `coaches` schema fields and naming: `**status` is the single source of truth** for access (`pending` | `approved` | `rejected` | `suspended`). No `access_status` column (avoids drift). Table/column comments document this.
- Add/confirm audit fields on `coaches`: `approved_by`, `approved_at`, `created_at`, `updated_at` (plus `trg_coaches_set_updated_at` to maintain `updated_at`).
- Ensure `coach_access_requests` includes all required review metadata and indexes: existing `review_notes`, `reviewed_by` → `coaches`, `reviewed_at`, `created_at`, `updated_at`; added `applicant_note`; partial index pending queue; `lower(email)` index; `reviewed_at` index; `trg_coach_access_requests_set_updated_at`; comments.

## Feature 2 - Coach/Admin Authentication + Access UI

- Add Google SSO sign-in flow in app.
- Add post-login access gate:
  - no `coaches` mapping -> show request access screen
  - `pending` -> pending screen
  - `rejected` -> rejected screen
  - `suspended` -> suspended screen
  - `approved` -> allow app access
- Add coach request submission UI writing to `coach_access_requests`.
- Build admin request queue UI (list pending requests, filter/search, open request detail).
- Build admin approve/reject actions with review notes.
- Build mobile-responsive admin screens for approval flow.

### Acceptance Criteria (Feature 1 + 2)

- End-to-end flow works: Google login -> request -> admin approve -> coach gains access.
- Pending/rejected/suspended users cannot access protected app screens.
- Admin-only actions are blocked for non-admin users at both UI and database levels.

## Feature 3 - Student + Fees Data Model (Database First)

- Expand `students`:
  - add `gender` (required for pricing)
  - add admission metadata
  - add sibling eligibility flags
  - optionally enforce `branch_id` required
- Keep `batch_members` for multi-batch membership.
- Add `student_custom_plans` (fixed-fee custom-day plans).
- Add `student_custom_plan_days` (selected weekdays).
- Add `student_one_on_one_plans` (separate 1:1 monthly sessions).
- Expand `batch_fees`:
  - `boys_monthly_fee`, `girls_monthly_fee`
  - `registration_fee`, `dress_fee`
  - effective date ranges
- Add `fee_policies` table (due day, sibling discount, referral rules).
- Upgrade `invoices`:
  - `due_date`, `subtotal`, `discount_total`, `total_due`, `generated_at`
  - unique `(student_id, billing_month, billing_year)`
- Add `invoice_line_items` for transparent fee breakdown.
- Add `student_one_time_charge_ledger` with unique `(student_id, charge_type)`.

### Acceptance Criteria (Feature 3)

- Schema supports multi-batch + custom-day + 1:1 combinations.
- Fee calculation inputs are fully data-driven (not hardcoded).
- One-time charges cannot be duplicated.

## Feature 4 - Student + Fees UI

- Build student profile page (personal info, branch, enrollments).
- Add enrollment UI for:
  - batch-wise selection
  - custom-day plan selection
  - separate 1:1 plan assignment
- Build fee view:
  - current month due
  - line-item fee breakdown
  - discounts shown clearly
  - due date reminder (before 7th)
  - manual payment status/history
- Ensure admin/coach UI is mobile-responsive.

### Acceptance Criteria (Feature 4)

- Admin/coach can explain every student fee from visible line items.
- Core student/fee actions are fully usable on phone and desktop.

## Feature 5 - QA + Release Readiness

- Migration dry-run on backup snapshot.
- RLS/policy role tests for `pending`, `approved`, `rejected`, `suspended`, `admin`.
- Billing tests:
  - boys/girls
  - siblings
  - multi-batch
  - custom fixed plans
  - 1:1 session rules
  - one-time charge non-duplication
  - branch-specific pricing
- Mobile regression checks for coach/admin and student/fee flows.

### Acceptance Criteria (Feature 5)

- Security, billing, and responsive behavior validated before go-live.

## Execution Order (Feature by Feature)

1. Feature 1 (Coach/Admin Auth DB) — **complete** (RLS, policies, `coaches`, `coach_access_requests`).
2. Feature 2 (Coach/Admin Auth UI) - complete end-to-end workflow
3. Feature 3 (Student/Fee DB) - implement full schema and constraints
4. Feature 4 (Student/Fee UI) - implement pages and interactions
5. Feature 5 (QA + release checks)