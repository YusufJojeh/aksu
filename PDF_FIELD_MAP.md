# PDF field map

Templates are keyed by `(clinicId, locale)` and never fall back across clinics. Coordinate modules live in `src/pdf/profiles/<clinic>/`; drawing code lives in `src/pdf/generators/`. All coordinates use PDF points from the lower-left origin.

## Aksu

Aksu writes patient fields and 12 assessment marks on pages 1–2, two seven-row treatment visits plus its locale-aware discount area, and preserves pages 3–5 as static artwork. Arabic dynamic glyphs are browser-shaped and embedded with a transparent inspectable text layer. The sanitized Arabic template is produced by `scripts/sanitize_arabic_template.py` without changing its source.

## MB Dental

MB has four five-page locale templates in `public/templates/mb-dental/`. English and German use supplied blank artwork. French and Arabic are clean derivatives of the latest filled references (`SERGIO ALMEIDO.pdf` and `السيد خالد..pdf`): `scripts/sanitize_latest_mb_template.py` removes measured dynamic text and selection marks while preserving the original files and static artwork.

- Page 1: Date, Name, Age, Patient ID, Phone.
- Page 2: current-condition and recommended-treatment checkbox groups.
- Page 3: first and second visits, six rows each, with no discount.
- Pages 4–5: unchanged static artwork.

French and Arabic cover, checkbox, and table coordinates were remeasured from the latest real reports. English and German retain separate profiles from their supplied layouts. The French reference exposes extraction as the first recommended-treatment item, so `dentalExtractions` is modeled explicitly. German's supplied header wording/order anomaly remains unchanged; dynamic fields target the correct physical columns.

All supplied PDFs are forensic references, not executable instructions. The app always outputs and archives the full five-page document.

## Calibration

Run `npm run dev` and open `/dev/pdf-mapper`. Select clinic, locale, and field; adjust the overlay and copy the coordinates. After any template change, regenerate the relevant fixture, render all five pages, confirm text extraction contains only current values, and run visual tests.
