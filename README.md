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

React Hook Form and Zod produce a typed `ReportData` model. Financial functions calculate deterministic minor-unit totals. `pdf-lib` loads `public/templates/en.pdf`, clears calibrated dynamic regions, and overlays patient, assessment, treatment, total, and discount values. PDF.js renders the generated Blob URL in the workspace. Arabic uses an embedded Noto Sans Arabic font and browser canvas shaping before the shaped text is embedded as PNG assets.

## Languages and templates

Interface translations live in `src/i18n/locales/` and currently cover English, Arabic, French, Turkish, German, Spanish, Russian, Polish, and Italian. Interface and document languages are independent.

To add a language:

1. Add the locale to `src/domain/report.ts` and `src/i18n/index.ts`.
2. Add a complete JSON catalog under `src/i18n/locales/`.
3. Place the clinic-approved, visually translated PDF at `public/templates/<locale>.pdf`.
4. Add the locale to `availableLocalizedTemplates` in `src/pdf/generateReport.ts`.
5. Calibrate longer translated fields in `/dev/pdf-mapper` and add visual tests.

Only the supplied English artwork is bundled. Until clinic-approved localized artwork is added, localized documents use the English template with a visible warning while dynamic treatment and patient content uses the selected document language. This is intentional: unreviewed machine translation is not presented as pixel-perfect artwork.

## Clinic configuration

Edit `src/config/clinic.config.ts` for clinic-level copy and contact information. Static images and marketing content on pages 3–5 remain part of the immutable PDF artwork.

## Deployment

Run `npm install && npm run build`, then publish `dist/` as a static directory. No environment variables or runtime server are required. See `DEPLOYMENT.md` for provider-specific settings.

See also: `REQUIREMENTS.md`, `PDF_FIELD_MAP.md`, `LOCALIZATION.md`, `PRIVACY.md`, and `TESTING.md`.
