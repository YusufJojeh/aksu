# PDF Field Map

Coordinates are PDF points measured from the bottom-left. Coordinate data now lives under `src/pdf/profiles/<clinic>/`, one module per clinic and locale, resolved by `(clinicId, locale)` through `src/pdf/profiles/resolve.ts` — never by locale alone, since two clinics can offer the same locale string with entirely different artwork.

## Dr. Emir Aksu

English remains in `src/pdf/profiles/aksu/en.ts`; Arabic is independently calibrated in `src/pdf/profiles/aksu/ar.ts` against the 594.75 × 842.25 supplied artwork. `src/pdf/profiles/aksu/index.ts`'s `coordinatesForAksuTemplate` selects coordinates from the template actually loaded, so fallback documents still use English geometry.

## Arabic page 1

| Field | x | y | width | height | size |
|---|---:|---:|---:|---:|---:|
| Report date | 54 | 392 | 211 | 23 | 13 |
| Patient name | 54 | 353 | 211 | 26 | 13 |
| Age (`<number> سنة`) | 54 | 316 | 211 | 25 | 13 |
| Phone (LTR content) | 54 | 278 | 211 | 25 | 13 |

## Arabic assessment mapping

| Semantic key | Printed Arabic diagnosis | Circle (x, y) |
|---|---|---:|
| `dentalAbscesses` | خراجات سنية | 187.1, 669.6 |
| `dentalCrowding` | تراكب الأسنان | 187.1, 649.7 |
| `toothWear` | تآكل الأسنان | 187.1, 629.8 |
| `malocclusion` | إطباق غير صحيح | 187.1, 609.9 |
| `existingDentalImplants` | زراعات سنية قائمة حاليا | 348.4, 669.6 |
| `existingDentalRestorations` | ترميمات سنية قائمة حاليا | 348.4, 649.7 |
| `teethRelativelyAligned` | أسنان مصطفة نسبيا | 348.4, 629.8 |
| `dentalCaries` | نخور سنية | 348.4, 609.9 |
| `missingTeeth` | فقد في بعض الأسنان أو جميعها | 547.1, 669.6 |
| `boneResorption` | امتصاص عظمي | 547.1, 649.7 |
| `gingivalRecession` | تراجع لثوي | 547.1, 629.8 |
| `gingivalInflammation` | التهاب اللثة | 547.1, 609.9 |

False leaves the template circle empty. True fills its exact circle in the source gold style.

## Arabic page 2 tables

Both tables run right-to-left: treatment x=409, quality x=325, quantity x=241, unit price x=127, total x=37. First-visit row baselines are 501, 481, 461, 441, 421, 401, 381. Second-visit baselines are 233, 214, 194, 174, 154, 134, 114. First total is `(37,357,238,20)`, discounted final price `(37,331,238,28)`, and second total `(37,90,241,22)`.

The Arabic visit heading and discount label are static artwork and are not redrawn. Empty data rows stay empty. EUR values use `<amount> يورو`; included rows use `مجاني` in price and total cells, with duration occupying the printed quantity column.

## Sanitization

Source SHA-256: `68EA9CF03B597AFB435ECF0BC72E5B76226079F98A1DE1DA1EA9054B347A8B43`. The one-time script removes page-1 sample value text; page-2 row, total, discount, and second-visit text; two selected-circle fills; and two value underlines. It applies text-only redaction separately from graphics removal, preserving the table rules and artwork. Run:

```bash
python scripts/sanitize_arabic_template.py "/path/to/clinic-source.pdf" --output public/templates/aksu/ar.pdf
```

Then extract text and render all five pages before accepting a replacement.

## MB Dental

MB Dental's four supplied template PDFs (English, French, German, Arabic; `public/templates/mb-dental/*.pdf`) are used as-is, with no sanitization step — they were supplied blank, not extracted from a filled sample. Each is a 5-page document: page 1 cover/patient fields (Name, Date, Age, **Patient ID**, Phone — Patient ID has no Aksu equivalent), page 2 Oral Health (two independent 8-item checkbox groups: "Current Dental Condition" and "Recommended Treatments"), page 3 Treatment Plan (First/Second visit tables, 6 rows each — not Aksu's 7 — with **no discount row or concept**), pages 4–5 fully static marketing artwork.

Coordinate modules live at `src/pdf/profiles/mb/{en,fr,de,ar}.ts`, all sharing the `MbPdfCoordinates` shape defined in `src/pdf/profiles/mb/types.ts` (`cover` / `oralHealth.{currentCondition,recommendedTreatments}` / `treatmentPlan.{firstVisit,secondVisit}` — no `discount` group, matching MB's registry capability `hasDiscount: false`). English, French, and German coordinates are visually near-identical in physical layout across the three templates; Arabic mirrors the same RTL descending-x row-ordering technique already proven for Aksu Arabic.

**Current status: all four MB coordinate modules ship placeholder pixel positions**, marked `// TODO(calibration)` in each file. They are structurally valid — every field the schema and generator expect is present — so the full pipeline (validation, live preview, PDF generation, download) runs end-to-end against the real MB template PDFs, but the on-page field positions are not yet visually calibrated. Real calibration is deferred to a follow-up pass via the upgraded `/dev/pdf-mapper` (see Calibration below): English first as the reference, then French/German (near-identical layout), then Arabic last reusing the proven RTL technique.

### German template anomaly

The German MB template's printed treatment-table header row is mistranslated and reordered relative to English/French: EN/FR read `Treatment | Material | Qty | Unit Price | Total`, but the German artwork prints `Behandlung | Menge (Quantity) | Materialpreis (Material Price) | unitarisch | Gesamt` — columns 2 and 3 are swapped labels. This is immutable supplied artwork and is **not corrected**. `src/pdf/profiles/mb/de.ts` documents the anomaly in a code comment and targets the same physical column positions as `en.ts`/`fr.ts` (column 2 = quality/material, column 3 = quantity) — i.e. what each column visually contains in every other locale, not what the German label happens to say.

### Reference document discrepancy

The one real filled reference document supplied for MB Dental (`Rapport dentaire de M. DEHARD.pdf`) is a 2-page trimmed export, not the full 5-page template. Per explicit confirmation, this is treated as a one-off manual export style, not the intended default — the app's Download action always produces MB's full 5-page PDF, matching the blank template shape rather than the trimmed reference.

## Calibration

Run `npm run dev` and open `/dev/pdf-mapper`. Select a clinic, then a locale, then any page-1/cover field, diagnosis or oral-health circle, row cell, total, or discount box (Aksu only). Adjust the overlay and copy the generated object. Re-run the relevant browser cases and page-image comparisons after any template replacement. The mapper is development-only.
