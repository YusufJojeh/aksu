# PDF Field Map

All coordinates are PDF points measured from the bottom-left of a 594.96 × 842.04 page. The executable source of truth is `src/pdf/coordinates.ts`.

## Page 1

| Field | x | y | width | height | size |
|---|---:|---:|---:|---:|---:|
| Report date | 91 | 395 | 215 | 18 | 13 |
| Patient name | 91 | 356 | 215 | 20 | 13 |
| Age | 68 | 320 | 238 | 19 | 13 |
| Phone | 91 | 283 | 215 | 20 | 13 |

## Page 2

Assessment circle points, all seven first-visit row cell boxes, total, discount sentence/price, second-visit heading, all seven second-visit row cell boxes, and total are defined in the structured map. Rows use a 21-point vertical rhythm.

## Calibration

Run `npm run dev` and open `/dev/pdf-mapper`. Select a field, adjust x/y/width/height/font size, inspect the overlay immediately, and copy the generated object. Production navigation never links to this route.
