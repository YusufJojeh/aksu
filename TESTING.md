# Testing

## Unit

`npm run test` covers deterministic minor-unit arithmetic, row totals, included/disabled rows, manual and percentage discounts, template-aware expiry validation, Arabic EUR formatting, RTL coordinates, all 12 Aksu assessment mappings, five-page template selection, stale-data extraction, international filenames, and text fitting — plus, for the multi-clinic layer: the clinic registry's capabilities/locales/currencies per clinic (`clinicRegistry.test.ts`), MB Dental's no-fallback-ever locale resolution and the `(clinicId, locale)` coordinate cache-collision fix (`templates.test.ts`), MB Dental report round-trip validation, its required Patient ID, and its complete absence of discount fields at the type level (`validation.test.ts`), and clinic-aware filename generation for both clinics (`filename.test.ts`).

## Browser

`npm run test:e2e` runs Chromium desktop and Pixel 7 projects. It covers patient entry, all diagnosis selections, Arabic template/EUR selection, first and second visits, discounts without Arabic expiry, five-page output, new-patient text extraction, stale-data absence, single-template-fetch preview/download reuse, reset, privacy, and mobile navigation — all through the shared `tests/e2e/helpers/selectClinic.ts` helper, which every spec now uses to pick a clinic before interacting with its form (`workspace.spec.ts`, `arabic-cases.spec.ts`, `final-qa.spec.ts`, and `visual.spec.ts` were each updated with a leading clinic-selection step and clinic-namespaced asset-path assertions).

Multi-clinic-specific coverage:

- `mb-workspace.spec.ts` — no patient-data form is present before a clinic is selected; MB Dental opens with its English default, EUR currency, and a live preview with no manual "generate" step; a filled MB report (including the required Patient ID and an oral-health checkbox) downloads a real five-page PDF; MB Dental renders no discount section at all.
- `clinic-switch.spec.ts` — switching clinics after entering data prompts a confirmation dialog, and the destination clinic's form starts genuinely empty (proves the `key={clinicId}` remount actually prevents state leakage between clinics); switching with no edits skips the confirmation.
- `mb-language-routing.spec.ts` — MB Dental's document-language picker offers exactly its 4 supported locales (never the other 5 UI-only locales); each of the 4 locales regenerates a real five-page PDF with the correct clinic-namespaced template fetched exactly once.

## Visual

`npm run test:visual` guards the existing English page. Arabic release QA also generates cases A-H (normal, long name, all diagnoses, seven rows, included row, discount on/off, and second visit), renders all pages with Poppler, and compares static pages 3-5 pixel-for-pixel against the sanitized template. Text extraction must reject `سكينة`, `02/09/2026`, `+34 613 43 52 52`, `30 سنة`, and the removed sample monetary values.

Release commands:

```bash
npm install
npm run lint
npm run test
npm run build
npm run test:e2e
npm run test:visual
```
