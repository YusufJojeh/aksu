# Requirements

## Product flow

Clinic staff enter document, patient, assessment, first-visit, discount, and second-visit details. A debounced browser-only pipeline validates the model, calculates totals, overlays the source PDF, creates a Blob URL, renders it with PDF.js, and downloads a safe filename.

## Functional rules

- A4 portrait, five pages, with the supplied PDF as the source artwork.
- Maximum seven fixed treatment rows per visit; rows can be disabled without deleting layout slots.
- Included rows never contribute to totals.
- Money is calculated in integer minor units; no currency conversion.
- Manual final price is the default discount mode; percentage mode is derived from gross total.
- Interface and document languages are independent; Arabic interface direction changes without reload.
- Reset and patient clearing require an accessible confirmation dialog.
- No automatic persistence and no server-side processing.

## Non-goals

Authentication, databases, cloud sync, remote translation, analytics, API-driven generation, and arbitrary table overflow are deliberately excluded.
