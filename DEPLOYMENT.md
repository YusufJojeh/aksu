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
