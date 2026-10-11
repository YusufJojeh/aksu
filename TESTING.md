# Testing

## Automated gates

- `npm run format:check`: Prettier (`printWidth` 120); `npm run format` rewrites.
- `npm run lint`: ESLint with zero warnings.
- `npm run db:types:check`: fails when `src/lib/database.types.ts` drifts from the live schema. Needs Docker running and `POSTGRES_URL` (or `DATABASE_URL`) in the environment or `.env.local`; regenerate with `npm run db:types` after every migration.
- `npm test`: arithmetic, validation, clinic isolation, locale routing, filename, RTL/text fitting, phone normalization, report review state and error mapping, and security-migration invariants (including the `report_reviews` RLS, one-decision, append-only, and session-reviewer rules).
- `npm run build`: TypeScript project build and production Vite bundle.
- `npm run test:e2e`: Chromium desktop and Pixel 7 workflows for clinic selection, entry, live preview, five-page downloads, reset, switching isolation, locale routing, and stale-data absence.
- `npm run test:e2e:auth`: real sign-in flows against a mocked Supabase (port 4175): administrator email + password sign-in, sales phone-only sign-in, exact archive re-download, in-app archived PDF viewing without a logged download, Done/Reject with a required note persisting across reload, the employee seeing the decision and note, and the sign-in language picker.
- `npm run test:visual`: stable page screenshots for desktop and mobile.

Playwright enables development-only `VITE_E2E_AUTH_BYPASS=1` on its local test server so PDF workflows do not depend on an external Supabase project. The flag is absent from production builds. Authorization lifecycle behavior is guarded by migration/RLS tests and must also be exercised in the production smoke pass.

## Release command set

```bash
npm install
npm run format:check
npm run lint
npm run db:types:check
npm test
npm run build
npm run test:e2e
npm run test:e2e:auth
npm run test:visual
```

The live smoke pass covers admin employee creation and phone sign-in, pending denial, activation, SALES `/admin` denial, ADMIN access, finalization and exact archive download, number reassignment history, offboarding denial, and responsive/RTL rendering.
