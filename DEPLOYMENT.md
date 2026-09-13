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
