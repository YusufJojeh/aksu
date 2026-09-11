# Doctor Aksu Treatment Plan Generator

A static, privacy-first React application for entering patient and treatment information, previewing the original five-page Doctor Aksu report, and downloading a finished PDF. All generation runs in the browser; there is no backend, account, database, analytics, or patient-data network request.

## Local development

```bash
npm install
npm run dev
npm run test
npm run build
```

The production bundle is written to `dist/`. The development-only coordinate mapper is available at `/dev/pdf-mapper` while `npm run dev` is running; it is excluded from production routing.

## How it works

React Hook Form and Zod produce a validated `ReportData` model. Shared minor-unit functions calculate row, visit, and discounted totals. `pdf-lib` selects the locale template and writes only dynamic fields. PDF.js previews the generated Blob, and download reuses that exact Blob. Arabic text is shaped by the browser with the bundled Noto Sans Arabic font; only the shaped dynamic glyph runs are embedded as transparent high-resolution images, never whole PDF pages.

## Languages and templates

Interface translations live in `src/i18n/locales/` and currently cover English, Arabic, French, Turkish, German, Spanish, Russian, Polish, and Italian. Interface and document languages are independent.

To add a language:

1. Add the locale to `src/domain/report.ts` and `src/i18n/index.ts`.
2. Add a complete JSON catalog under `src/i18n/locales/`.
3. Place the clinic-approved, visually translated PDF at `public/templates/<locale>.pdf`.
4. Add the locale to `availableLocalizedTemplates` in `src/pdf/generateReport.ts`.
5. Calibrate longer translated fields in `/dev/pdf-mapper` and add visual tests.

English and Arabic artwork are bundled. `public/templates/ar.pdf` is the sanitized clinic-supplied five-page Arabic template and does not fall back to English. Other document locales continue to use the English artwork with a visible warning. Selecting Arabic defaults document currency to EUR without coupling document language to interface language.

The Arabic source was flat and contained sample patient/treatment data. `scripts/sanitize_arabic_template.py` removes those text objects and sample selection/underline vectors once, then writes a clean reusable template. Runtime generation never performs sanitization or hides old text with rectangles. See `PDF_FIELD_MAP.md` for the removal regions, assessment semantics, and recalibration workflow.

## Clinic configuration

Edit `src/config/clinic.config.ts` for clinic-level copy and contact information. Static images and marketing content on pages 3–5 remain part of the immutable PDF artwork.

## Deployment

Run `npm install && npm run build`, then publish `dist/` as a static directory. No environment variables or runtime server are required. See `DEPLOYMENT.md` for provider-specific settings.

See also: `REQUIREMENTS.md`, `PDF_FIELD_MAP.md`, `LOCALIZATION.md`, `PRIVACY.md`, and `TESTING.md`.
