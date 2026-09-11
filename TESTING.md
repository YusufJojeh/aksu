# Testing

## Unit

`npm run test` covers deterministic minor-unit arithmetic, row totals, included/disabled rows, manual and percentage discounts, template-aware expiry validation, Arabic EUR formatting, RTL coordinates, all 12 assessment mappings, five-page template selection, stale-data extraction, international filenames, and text fitting.

## Browser

`npm run test:e2e` runs Chromium desktop and Pixel 7 projects. It covers patient entry, all diagnosis selections, Arabic template/EUR selection, first and second visits, discounts without Arabic expiry, five-page output, new-patient text extraction, stale-data absence, single-template-fetch preview/download reuse, reset, privacy, and mobile navigation.

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
