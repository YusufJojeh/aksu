# Testing

## Unit

`npm run test` covers deterministic minor-unit arithmetic, row totals, included/disabled rows, manual and percentage discounts, currencies, validation, RTL utilities, international filenames, and text fitting.

## Browser

`npm run test:e2e` runs Chromium desktop and Pixel 7 projects. It covers app loading, patient entry, assessment selection, totals, English-to-Arabic switching, RTL direction, Arabic patient names, preview, download filename, reset confirmation, and mobile Edit/Preview navigation.

## Visual

`npm run test:visual` captures the first rendered PDF page from PDF.js. Commit the approved baseline with `npx playwright test tests/e2e/visual.spec.ts --update-snapshots`. For release review, also render the downloaded PDF pages with `tmp/pdfs/inspect_source.py` (bundled Python runtime uses pypdfium2) and inspect all five images for overlap, glyph, page-size, and static-artwork regressions.
