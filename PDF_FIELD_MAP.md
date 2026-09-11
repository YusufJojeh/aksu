# PDF Field Map

Coordinates are PDF points measured from the bottom-left. English remains in `src/pdf/coordinates/en.ts`; Arabic is independently calibrated in `src/pdf/coordinates/ar.ts` against the 594.75 × 842.25 supplied artwork. `src/pdf/coordinates.ts` selects coordinates from the template actually loaded, so fallback documents still use English geometry.

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
python scripts/sanitize_arabic_template.py "/path/to/clinic-source.pdf" --output public/templates/ar.pdf
```

Then extract text and render all five pages before accepting a replacement.

## Calibration

Run `npm run dev` and open `/dev/pdf-mapper`. Select Arabic or English, then any page-1 field, diagnosis circle, row cell, total, or discount box. Adjust the overlay and copy the generated object. Re-run the A-H browser cases and page-image comparisons after any template replacement. The mapper is development-only.
