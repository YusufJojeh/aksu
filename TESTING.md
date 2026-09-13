# Testing

## Automated gates

- `npm run lint`: ESLint with zero warnings.
- `npm test`: arithmetic, validation, clinic isolation, locale routing, filename, RTL/text fitting, phone normalization, and security-migration invariants.
- `npm run build`: TypeScript project build and production Vite bundle.
- `npm run test:e2e`: Chromium desktop and Pixel 7 workflows for clinic selection, entry, live preview, five-page downloads, reset, switching isolation, locale routing, and stale-data absence.
- `npm run test:visual`: stable page screenshots for desktop and mobile.

Playwright enables development-only `VITE_E2E_AUTH_BYPASS=1` on its local test server so PDF workflows do not depend on an external Supabase project. The flag is absent from production builds. Authorization lifecycle behavior is guarded by migration/RLS tests and must also be exercised in the production smoke pass.

## Release command set

```bash
npm install
npm run lint
npm test
npm run build
npm run test:e2e
npm run test:visual
```

The live smoke pass covers signup/pending denial, activation, SALES `/admin` denial, ADMIN access, finalization and exact archive download, number reassignment history, offboarding denial, and responsive/RTL rendering.
