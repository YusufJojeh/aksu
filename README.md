# Dental Treatment Plan Generator

A static, privacy-first React application for entering patient and treatment information, previewing a clinic's original five-page treatment plan report, and downloading a finished PDF. All generation runs in the browser; there is no backend, account, database, analytics, or patient-data network request.

The app is multi-clinic: it currently ships **Dr. Emir Aksu** and **MB Dental** (MB Dental Turkey). Picking a clinic opens an isolated workspace scoped to that clinic's own data shape, template artwork, and PDF coordinates — there is no cross-clinic fallback, ever. See "Clinic architecture" below.

## Local development

```bash
npm install
npm run dev
npm run test
npm run build
```

The production bundle is written to `dist/`. The development-only coordinate mapper is available at `/dev/pdf-mapper` while `npm run dev` is running; it is excluded from production routing.

## How it works

The app opens on a clinic picker (`src/components/ClinicSelect.tsx`); selecting a clinic mounts a `ClinicWorkspace` keyed by clinic id, which guarantees a clean remount (no leaked state) when switching clinics. React Hook Form and Zod produce a validated `ReportData` model — a **discriminated union on `clinicId`**, since Aksu (discount fields, no patient ID, 12-key flat assessment) and MB Dental (patient ID, no discount, two 8-key oral-health groups) genuinely diverge in shape. Shared minor-unit functions calculate row and visit totals for both clinics; discount totals are Aksu-only. `pdf-lib` resolves the template and coordinates for the active `(clinicId, locale)` pair and writes only dynamic fields. PDF.js previews the generated Blob, and download reuses that exact Blob. Arabic text is shaped by the browser with the bundled Noto Sans Arabic font; only the shaped dynamic glyph runs are embedded as transparent high-resolution images, never whole PDF pages — the same technique is reused for MB Dental's Arabic template.

## Clinic architecture

`src/clinics/registry.ts` is the single source of truth for clinic-level facts: display name, capabilities (`hasDiscount`, `hasPatientId`, `treatmentRowsPerVisit`), supported document locales, default currency, filename prefix, and PDF author/creator metadata. `src/pdf/profiles/` holds each clinic's coordinate data under `profiles/aksu/` and `profiles/mb/`, resolved through `src/pdf/profiles/resolve.ts`'s `resolveTemplate(clinicId, locale)` / `coordinatesForTemplate(clinicId, locale)` — template identity is always `(clinic, locale)`, never locale alone, so two clinics sharing a locale string can never collide or fall back into each other's artwork.

To add a clinic: add its id to `src/clinics/types.ts`, add its registry entry, add a branch to the `reportSchema` discriminated union in `src/domain/report.ts`, add a `profiles/<clinic>/` coordinate module and a `generators/<clinic>.ts` drawing module (sharing the clinic-agnostic helpers in `generators/shared.ts`), add a `<Clinic>ReportForm.tsx` component, and place its template PDFs at `public/templates/<clinic>/<locale>.pdf`.

## Languages and templates

Interface translations live in `src/i18n/locales/` and currently cover English, Arabic, French, Turkish, German, Spanish, Russian, Polish, and Italian. Interface and document languages are independent, and the interface language applies app-wide across both clinics.

Document (template) languages are scoped per clinic — Aksu supports all 9 UI locales (falling back to English artwork with a visible warning outside English/Arabic); MB Dental supports exactly the 4 locales it has real template PDFs for (English, French, German, Arabic) and throws rather than silently falling back for any other locale.

To add a document language to an existing clinic:

1. Add the locale to that clinic's `supportedDocumentLocales` in `src/clinics/registry.ts` (and, for Aksu, confirm it's already in the app-wide `locales` list in `src/domain/report.ts`).
2. Add a complete JSON catalog under `src/i18n/locales/` if the interface doesn't already support it.
3. Place the clinic-approved, visually translated PDF at `public/templates/<clinic>/<locale>.pdf`.
4. Add a coordinate module under `src/pdf/profiles/<clinic>/<locale>.ts` and register it in that clinic's `profiles/<clinic>/index.ts`.
5. Calibrate fields in `/dev/pdf-mapper` and add visual tests.

English and Arabic artwork are bundled for Aksu; `public/templates/aksu/ar.pdf` is the sanitized clinic-supplied five-page Arabic template and does not fall back to English. Other Aksu document locales continue to use the English artwork with a visible warning. Selecting Arabic defaults document currency to EUR without coupling document language to interface language. MB Dental ships English, French, German, and Arabic artwork with **no fallback locale at all** — an unsupported MB document locale is a hard error, not a substitution.

The Aksu Arabic source was flat and contained sample patient/treatment data. `scripts/sanitize_arabic_template.py` removes those text objects and sample selection/underline vectors once, then writes a clean reusable template. Runtime generation never performs sanitization or hides old text with rectangles. See `PDF_FIELD_MAP.md` for the removal regions, assessment semantics, and recalibration workflow. MB Dental's four template PDFs are used as supplied; note that the German MB template's treatment-table header labels are mistranslated/reordered relative to the English/French artwork — this is left untouched as static clinic artwork, and dynamic values still target the physically correct columns (see `PDF_FIELD_MAP.md`).

MB Dental's coordinate modules under `src/pdf/profiles/mb/*.ts` currently ship with structurally valid **placeholder** pixel positions pending real calibration via `/dev/pdf-mapper` against the supplied template PDFs — the type system, schema validation, and generation pipeline are all complete and exercised end-to-end against the real MB artwork, but the on-page field positions are not yet visually correct.

## Deployment

Run `npm install && npm run build`, then publish `dist/` as a static directory. No environment variables or runtime server are required. See `DEPLOYMENT.md` for provider-specific settings.

See also: `REQUIREMENTS.md`, `PDF_FIELD_MAP.md`, `LOCALIZATION.md`, `PRIVACY.md`, and `TESTING.md`.
