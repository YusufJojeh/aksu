# Deployment

Production is a single Vercel project (`pdfbuilder`) with Supabase provisioned through the Vercel Marketplace integration (Storage tab → Supabase), so the database lives under the same Vercel account and its connection variables sync into the project automatically.

## Supabase

1. `npx vercel integration add supabase` (run once; provisions a project and connects it, injecting `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `POSTGRES_URL_NON_POOLING`, etc. into Production/Preview/Development).
2. Apply `supabase/migrations/202609120001_operations.sql` against the project's transaction pooler (port `6543`; the direct/session-mode host is IPv6-only unless the IPv4 add-on is purchased):
   ```bash
   psql "$POSTGRES_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202609120001_operations.sql
   ```
3. Create the first account through the deployed app's Register screen, then promote it once from the Supabase SQL editor:
   ```sql
   update public.profiles set role = 'ADMIN', status = 'active' where email = 'admin@example.com';
   ```

All later accounts start as `SALES/pending` and are activated by an administrator from the Employees admin screen. The `report-pdfs` storage bucket is private and created by the migration.

Employee invitations (`POST /api/admin/invite-employee`) run as a Vercel serverless function, not a Supabase Edge Function — it uses `SUPABASE_SERVICE_ROLE_KEY` server-side (never sent to the browser) and is authorized by checking the caller's bearer token against `profiles.role = 'ADMIN'` before calling `auth.admin.inviteUserByEmail`. This avoids a second deploy target/credential (Supabase CLI login) for a single admin-only endpoint.

## Vercel

Production variables (see `.env.example`):

```text
VITE_SUPABASE_URL=https://PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=PUBLIC_ANON_KEY
```

`VITE_SUPABASE_ANON_KEY` is intentionally public (`--type config`) — it is meaningless without the RLS policies the migration installs. `SUPABASE_SERVICE_ROLE_KEY` and the `POSTGRES_*` variables stay server-only (never `VITE_`-prefixed) and are only read by `api/admin/invite-employee.ts` and manual migration runs. Build with `npm run build`; publish `dist`; `api/**` deploys as Vercel serverless functions alongside it. `vercel.json` supplies SPA routing and baseline browser-security headers.

## Release gate

Run `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`, and `npm run test:visual`. After deploying, smoke-test sign-in, role denial, one finalization, exact archive download, admin analytics, number reassignment, invite-employee, and suspended-user denial.

## Verification log

### 2026-09-13 — commit `ea1e115`, https://pdfbuilder-chi.vercel.app

Full local gate passed (lint, unit, build, E2E, visual) before deploy. Production database was already current (migrations, admin self-promotion guard, `finalize_report` redeploy fix, private `report-pdfs` bucket all present) — no migration run needed. Deployed via `vercel --prod`.

Production smoke pass, run against the live REST/RPC/Storage API using the dedicated `smoke-test-admin`/`smoke-test-sales` accounts:

- Sign-in — both accounts authenticated.
- Role denial — SALES blocked from an admin-only RPC, from self-promoting via `profiles`, and from reading other employees' profiles.
- Finalization — `finalize_report` created a correctly-populated row with matching totals/hash.
- Exact archive download — downloaded bytes were a byte-for-byte SHA-256 match against the uploaded PDF; a repeat download logged a second event without creating a duplicate report row.
- Admin analytics — ADMIN could read all reports/employees/channels/events.
- Number reassignment — reassigning a channel preserved the prior assignment's history (`unassigned_at` set, row kept) and created a new one; reverted afterward.
- Invite-employee — `/api/admin/invite-employee` returned 403 for a non-admin caller, 401 unauthenticated, 400 on an invalid phone number (guard checks only; no invite email was actually sent).
- Suspended-user denial — enforced at the database level (RPC + RLS), not just the UI; the account was restored to `active` afterward.

All checks passed with no code or schema changes required.

### 2026-09-13 — commits `7e2a02f`, `98eb1c1`, https://pdfbuilder-chi.vercel.app

Two follow-up fixes, each deployed and smoke-tested against production before being committed:

**Server-side hash verification for `finalize_report` (`7e2a02f`).** An integrity audit found `finalize_report` only validated that `p_pdf_sha256` was *shaped* like a hash and that some object existed at the storage key — it never checked the hash actually matched that object's bytes, so a caller bypassing the app could record any well-formed hash next to a real PDF (confirmed by direct RPC exploit, and by two pre-existing production rows with mismatched hashes). Fixed with:
- New `report_pdf_checksums` table (migration `202609130003_report_pdf_checksum_verification.sql`), RLS-enabled with no grants to `anon`/`authenticated` — writable only by the service role.
- New `/api/reports/verify-pdf` serverless function that downloads the just-uploaded object with the service-role key, computes the real SHA-256 server-side, and records it.
- `finalize_report` now rejects any hash that doesn't match a row in that table; `src/lib/operations.ts` calls the new endpoint after upload instead of trusting a client-computed hash.

Smoke-tested: uploaded a PDF, called `verify-pdf` (returned hash matched the true file hash), confirmed `finalize_report` now rejects a mismatched hash with `pdf hash has not been verified against the archived object`, confirmed it still succeeds with the server-verified hash, and confirmed the archived PDF downloads byte-for-byte identical. The two legacy mismatched-hash rows from earlier testing were left as-is (not retroactively fixed).

**Admin channel editing (`98eb1c1`).** A full-CRUD audit found the database already permitted admins to update a communication channel's `phone_e164`/`label`/`type` (via the existing `channels_admin_all` RLS policy and `UPDATE` grant), but the admin UI never exposed it — only a status toggle and assignment. Added `updateChannel()` and inline-editable phone/label/type fields to `ChannelsAdmin`. Smoke-tested: admin update succeeds and persists; the same update attempted as a SALES account is silently denied by RLS with no rows affected.

Audit conclusion: reports remain intentionally immutable (no `UPDATE`/`DELETE` grant, enforced further by a DB trigger) and employees/channels remain intentionally non-hard-deletable (no `DELETE` grant to the application role) — both are deliberate audit-integrity properties of the system, not gaps, and were left unchanged.

### 2026-09-13 — commit `1b1b409`, https://pdfbuilder-chi.vercel.app

Four admin-facing additions, deployed and smoke-tested against production before being committed:

**Employee hard-delete (`api/admin/delete-employee.ts`, `deleteEmployee()` in `src/lib/operations.ts`).** Admins can now permanently remove an employee (`profiles` row, then the `auth.users` row via `service.auth.admin.deleteUser`) instead of only suspending/offboarding. No custom "has history?" check was needed: `profiles.id` is already referenced with `on delete restrict` from `reports`, `channel_assignments`, and `report_events`, so Postgres itself rejects the delete (`23503`) whenever the employee has any trace at all; the endpoint just maps that error code to a `409 employee_has_history` response. Self-delete is blocked explicitly. `EmployeesAdmin` gained a delete button (via `ConfirmDialog`) alongside the existing offboard controls.

Smoke-tested against production: deleting a freshly created employee with zero history succeeded (profile and auth user both gone); deleting the caller's own account returned `400 cannot_delete_self`; deleting an employee with an existing finalized report returned `409 employee_has_history` and left the profile untouched.

**Customer directory (`supabase/migrations/202609130004_customers_directory.sql`, `CustomersAdmin.tsx`).** A new standalone `customers` table (name, phone, patient identifier, notes, clinic, status) that admins can view/edit directly — decoupled from any single report, since report patient data is already frozen into `report_payload` at finalize time and stays immutable. RLS restricts all access to `is_admin()`; `created_by_employee_id`/`updated_at` are set server-side by a trigger, never trusted from the client. Migration applied to production.

Smoke-tested against production: create, inline update, and archive/reactivate all worked as an admin via REST; `anon` correctly gets `permission denied` (no grant), consistent with every other admin-only table in this schema.

**Admin dashboard i18n.** The admin dashboard previously used the same 9-locale i18n system as the report builder, but only for generated PDFs — the dashboard's own UI (nav, buttons, tables, filters) was hardcoded English. Added a new `admin` namespace to all 9 locale files and converted `AdminDashboard`, `EmployeesAdmin`, `ChannelsAdmin`, `ReportsAdmin`, `AdminAnalytics`, and the new `CustomersAdmin` to `useTranslation()`. Added a language switcher to the dashboard header, wired the same way as the sales workspace (`i18n.changeLanguage` + `document.documentElement.lang`/`dir` via `isRtl()`), persisted per-browser in `localStorage`.

**Mobile-responsive admin UI.** Added `Accordion`/`AccordionItem`/`AccordionField` primitives to `src/components/ui.tsx` (plain `<details>`/`<summary>`, no new dependency). Every admin screen, plus the sales-side `MyReports.tsx`, now renders the existing `<table>` behind `hidden md:block` and a parallel `md:hidden` accordion (one item per row) reusing the same `t()` keys and handlers as the desktop view, rather than a second parallel implementation.

Full local gate passed (lint, unit, build) before each deploy. Visual/layout verification of the authenticated admin screens (including the new accordion mobile view) was not done via live browser — injecting a session token to bypass the sign-in form is blocked by the environment's own safety classifier, the same restriction that blocks typing credentials into it — so that part relies on the automated checks above plus a manual look, rather than a screenshot-verified pass.

Not included in this batch: a separate migration (`202609130005_auto_assign_channel_on_finalize.sql`) that would auto-claim a free communication channel on report finalize instead of requiring manual assignment first. It's a distinct behavior change, written but intentionally left unapplied and uncommitted pending explicit sign-off.

### 2026-09-13 — migration `202609130005_auto_assign_channel_on_finalize.sql`, https://pdfbuilder-chi.vercel.app

**Auto-assign a communication channel on finalize.** Previously a newly invited sales employee's reports carried no live company number until an admin manually ran `assign_channel` for them — `finalize_report` fell back to the employee's own `requested_phone_e164` until then. This migration makes `finalize_report` self-serve: if the finalizing employee has no current channel assignment, it now claims one active, currently-unassigned `communication_channel` on their behalf (oldest first, `for update skip locked` so two concurrent finalizes can't race onto the same number) and records the assignment in the same transaction as the report insert. Admins can still see and reassign the number afterward via the existing `assign_channel`/`unassign_channel` UI.

A pre-apply review of the original version (written in a concurrent session on this branch) found the channel-claim `insert into channel_assignments` was left uncaught: the two partial unique indexes that guarantee "one current channel/one current employee" don't participate in the same row-locking as the new auto-claim, so a concurrent admin `assign_channel`/`unassign_channel` call, or a double-submitted finalize for the same employee, could raise an uncaught `unique_violation` that aborted the entire `finalize_report` transaction — turning a channel-numbering conflict into a failed report. Fixed before applying by wrapping that single insert in a nested `begin ... exception when unique_violation then ... end;` block (an implicit savepoint), so losing that race now falls back to "no channel claimed" — identical to the already-existing no-free-channel path — instead of aborting the report.

Applied directly via `psql` against production (no frontend/serverless code changed, so no Vercel redeploy was needed for this fix). Smoke-tested end-to-end: a throwaway sales employee with no channel assignment, calling `finalize_report` with a real hash-verified archived PDF, correctly auto-claimed one of the two free active channels and produced a matching `channel_assignments` row. The employee could not be hard-deleted afterward (`employee_has_history`, `on delete restrict` via its new report/channel-assignment) — confirming that guarantee still holds — so it was offboarded (`status = 'former'`) instead of deleted, and the harmless smoke-test report/channel-assignment rows were left in place, consistent with how earlier smoke tests in this log were cleaned up.

### 2026-09-14 — deployment `dpl_ACQfkugPzpr34cV8AsEeZKSCp6A3`, https://pdfbuilder-chi.vercel.app

**MB Dental treatment tables: larger, cell-centered values.** Dynamic page-3 table values (treatment, material, quantity, unit price, line total, included/offered) are now drawn centered inside the real gridline-bounded cells using font metrics (`drawCenteredCell` in `src/pdf/generators/shared.ts`, cell boxes from `src/pdf/profiles/mb/table.ts`). Preferred sizes: fr/de 18pt, en 20pt, ar 19pt (prices/totals 20pt); values only shrink toward 11–12pt when too wide, and a value that still overflows wraps to two centered lines instead of truncating. Arabic uses ink-bounds centering in the browser-shaped path; Arabic-locale digits print in Helvetica. The en/de templates' MediaBox starts at y=7.83, so their row edges are offset accordingly. Artwork, row heights, columns, and the totals boxes are unchanged; Aksu still uses the old `drawFitted` path.

Verified by per-cell ink measurement of page 3 on the Sergio (fr), Ahmed/Khaled/Rami (ar), English and German fixtures: every value centered (|dx| ≤ 1.2pt), no truncation, minimum 2.3pt clearance from gridlines. Full gate passed (lint, 39 unit tests, build, 47 E2E incl. visual). Not committed at deploy time.

### 2026-10-10 — commits `26f717a`, `c3444f1`, https://pdfbuilder-chi.vercel.app

**Sales report history, document archive, API hardening, UI polish.** Migrations `202609150001_guard_profile_phone.sql` (non-admins cannot claim a phone another profile uses) and `202609150002_employee_documents.sql` (immutable `employee_documents` archive for MB warranty certificates and invitation letters, owner-scoped storage policy) were applied to production via `psql` before deploy. Sales "My Reports" now shows edit-chain history, a created/edited/downloaded log, dup/dedup filters, and re-download of any version or archived document. Serverless admin endpoints share one `requireAdmin` guard; `finalize-public` caps PDF size (15 MB), validates `parentReportId`, and requires the parent to belong to the caller; error bodies are generic and details are logged server-side. UI polish: flex-column sales shell (no hard-coded `100vh` offsets, no page overflow, header no longer slides under the sticky bar), compact mobile nav, Geist across sales and admin, themed selection/caret/scrollbar/focus, `scale(0.97)` press feedback with a strong ease-out.

Full gate passed: lint, 108 unit tests, build, 70 E2E (30 skipped by project), 3 visual. Seven E2E failures that were present before this release (strict-mode `getByLabel('Apply discount')` now matching both visit checkboxes) were fixed in the tests; four preview goldens were refreshed for a sub-pixel canvas-size change (PDF content identical in diffs). Smoke-tested production: `/` and `/admin` 200, new CSS served, `login-phone` without a body → 400, `invite-employee` without auth → 401.

### 2026-10-10 — deployment `dpl_DovX1vNSXRah2EWgNjTm2AjmjEYz` (commits `ff0b0c8`, `1e15944`), https://pdfbuilder-chi.vercel.app

**Impeccable UI pass and architecture cleanup.** `ff0b0c8` ships the audit/critique/harden/adapt UI fixes (guest re-download reuses the exact finalized bytes, named confirm buttons, workspace kept mounted while hidden, locale parity test). `1e15944` is a behavior-preserving refactor: `api/_lib/http.ts` replaces `api/_lib/admin.ts` and the per-handler copies of request types, `requireEnv`, POST/body guards and the bearer/active-account check; `src/lib/operations.ts` is now a barrel over `src/lib/api/{reports,employees,channels,customers,documents}.ts` with shared `authedPost`, `sha256Hex` and `requireE164`. No migrations.

Full gate passed: tsc, lint, 121 unit tests, build, 70 E2E (30 skipped by project), 3 visual. Smoke-tested production: `/` 200; every API route answers GET with 405 `method_not_allowed`; `verify-pdf` and `invite-employee` without a token → 401 `unauthorized`; `employee-login`, `login-phone` and `finalize-public` with invalid bodies → 400 with their unchanged messages.

### 2026-10-10 — deployment `dpl_HeX6NyD59GoDSYoe9sJUkXMWM7rq` (commits `ef142f6`, `f511eb9`, `22a69d7`), https://pdfbuilder-chi.vercel.app

**Typed schema, coded errors, server-verified document hashes, Prettier.** `src/lib/database.types.ts` is generated from the live schema (`npm run db:types`; `npm run db:types:check` is now a release-gate step) and types both Supabase clients. Data-layer and endpoint errors carry a `code`, which screens translate from the new `errors.*` section in all 9 locales. Warranty/invitation uploads are re-hashed and page-checked by `/api/reports/verify-pdf` before the archive row is written. The whole codebase is formatted with Prettier (`printWidth` 120); the reformat commit is listed in `.git-blame-ignore-revs`.

Migrations (via `psql` on the pooler): `202610100001_customers_creator_default.sql` (`customers.created_by_employee_id` defaults to `auth.uid()`, matching the guard trigger) was applied before deploy. `202610100002_employee_documents_verified_hash.sql` was applied after the deploy went Ready, so no client ever hit the stricter policy without the verify call: `employee_documents_insert` now also requires `pdf_checksum_verified(pdf_storage_key, pdf_sha256)`. The function is executable by `authenticated`, but not by `anon` (verified). The previous policy conditions were confirmed unchanged before the replacement. Types were regenerated afterwards and `db:types:check` passes.

Full gate passed: format:check, tsc, lint, 127 unit tests, build, 70 E2E (30 skipped by project), 3 visual. Smoke-tested production: `/` 200; `verify-pdf` without a token → 401 `unauthorized`; bad `login-phone` → 401 `{ code: "invalid_credentials" }`; bad `employee-login` phone → 400 `{ code: "invalid_phone" }`; `finalize-public` GET → 405.

### 2026-10-10 — deployment `dpl_By2Vdg4DMQi7uzHmngvGT8huDtg6` (commit `30f971e`), https://pdfbuilder-chi.vercel.app

**No self-registration; admins sign in by email only.** The Register tab and `AuthProvider.register()` are gone, so the app never calls Supabase `signUp`; employees arrive only through the admin invite. `/admin` signs in by email + password through the new `/api/auth/admin-login`, which refuses every non-ADMIN profile with the same generic `invalid_credentials` answer as a wrong password before any session is created. It replaces `/api/auth/login-phone`. Sales staff still sign in on `/` by phone number alone (`employee-login`). The sign-in, loading, account-status and access-denied screens are translated (`adminAuth.*`, 9 locales) with an endonym language picker; one persisted admin locale is shared with the dashboard. No migrations.

**Still open:** the Supabase project has `disable_signup: false`, so the public sign-up API still accepts direct calls with the anon key, creating `pending` profiles with no access. Turn off "Allow new users to sign up" in Authentication settings; admin invites keep working.

Full gate passed: format:check, tsc, lint, 128 unit tests, build, 70 E2E (30 skipped by project), 3 visual, and the revived `test:e2e:auth` suite (6/6: admin email sign-in, sales phone sign-in, archive re-download, sign-in language). Smoke-tested production: `/admin` 200; `admin-login` with a phone number → 400 and with an unknown email → 401, both `invalid_credentials`; GET → 405; old `login-phone` no longer served; `employee-login` with a bad phone → 400 `invalid_phone`.
