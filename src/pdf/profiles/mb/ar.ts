import { box } from '../shared/fieldBox'
import { checkboxColumn, mbConditionRowOrder, mbRecommendedRowOrderLatin } from './checkbox'
import { mbArabicCellSizes, mbTableRows } from './table'
import type { MbPdfCoordinates } from './types'

// Cover-page fields are calibrated against the real supplied Arabic template (measured directly
// from its embedded text-object positions: the label column consistently ends around x=230, so
// each value box runs from the shared left margin (x=37, matching the treatment table below) to
// just short of its own label's left edge). Row order within each treatment table is
// right-to-left (treatment rightmost, total leftmost), reusing the same RTL column technique
// already proven and tested for the Aksu Arabic template (src/pdf/profiles/aksu/ar.ts). The
// phone field keeps `direction: 'ltr'` — phone numbers read left-to-right even inside an RTL
// document, matching the Aksu Arabic template's convention.
//
// Oral-health circle marks and treatment-plan table cells below are calibrated against the real
// template artwork, measured the same way as en.ts/de.ts (render at scale=3, pixel-scan for
// gridline/checkbox bounding boxes, convert back to PDF points). Two things this measurement
// corrected versus the placeholder it replaces:
//  - The two checkbox panels are NOT mirrored left/right versus the Latin templates: "Current
//    Dental Condition" (الحالة السنية الحالية) prints on the LEFT (low x) and "Recommended
//    Treatments" (العلاجات الموصى بها) on the RIGHT (high x), same physical sides as en.ts/de.ts —
//    only the label text direction is RTL, not the panel layout itself.
//  - The real printed header order, right-to-left, is العلاج (treatment) | الكمية (quantity) |
//    المواد (material/quality) | سعر الواحدة (unit price) | المجموع (total) — quantity sits
//    directly left of treatment, with quality/material one column further left. That's
//    quantity-before-quality going right-to-left, not quality-before-quantity as the placeholder
//    guessed.
// Treatment-table cells are the real gridline-bounded cells, re-measured at 4x against the
// artwork and the filled references (السيد رامي.pdf). Printed header order right-to-left is
// العلاج (treatment) | المواد (material/quality) | الكمية (quantity) | السعر (unit price) |
// المجموع (total). As with de.ts, the second table's outer border and dividers sit further left
// than the first table's, so each visit has its own measured columns and row lines.
const firstVisitColumns = {
  treatment: [409.8, 565.4], quality: [315.2, 409.8], quantity: [232.0, 315.2], unitPrice: [130.0, 232.0], total: [27.6, 130.0],
} as const
const secondVisitColumns = {
  treatment: [409.8, 559.8], quality: [319.8, 409.8], quantity: [238.0, 319.8], unitPrice: [136.0, 238.0], total: [21.8, 136.0],
} as const

export const arMbPdfCoordinates: MbPdfCoordinates = {
  cover: {
    patientName: box(100, 364, 125, 25, 18, 'right', 'rtl'),
    reportDate: box(150, 301, 92, 23, 12, 'center', 'ltr'),
    age: box(179, 237, 52, 23, 12, 'right', 'rtl'),
    patientId: box(135, 179, 98, 26, 18, 'center', 'ltr'),
    phone: box(100, 120, 137, 24, 16, 'center', 'ltr'),
  },
  oralHealth: {
    // Measured from the artwork's own gold outlines (scripts/measure_mb_checkboxes.py). The
    // Arabic page draws two overlapping square layers; these are the outer filled-and-stroked
    // squares, which are the visible border. Panels sit on the same physical sides as the Latin
    // templates with the columns mirrored, so conditions are the left-hand x=283 column.
    currentCondition: checkboxColumn(mbConditionRowOrder, 283.4, [
      [663.60, 13.20, 13.20], [631.70, 13.20, 13.20], [603.10, 13.20, 13.20], [576.40, 13.20, 13.20],
      [547.10, 13.20, 13.20], [516.40, 13.20, 13.20], [484.60, 13.20, 13.20], [455.20, 13.20, 13.20],
    ]),
    recommendedTreatments: checkboxColumn(mbRecommendedRowOrderLatin, 543.9, [
      [330.40, 13.20, 13.20], [298.60, 13.20, 13.20], [269.70, 13.20, 13.20], [240.40, 13.20, 13.20],
      [211.10, 13.20, 13.20], [179.20, 13.20, 13.20], [149.90, 13.20, 13.20], [120.70, 13.20, 13.20],
    ]),
  },
  treatmentPlan: {
    firstVisit: { rows: mbTableRows(firstVisitColumns, [655.25, 628.1, 601.0, 573.2, 546.2, 519.2, 484.2], mbArabicCellSizes, 'rtl'), total: box(49, 430, 230, 44, 32, 'center', 'ltr') },
    secondVisit: { rows: mbTableRows(secondVisitColumns, [335.0, 307.5, 280.5, 252.8, 225.8, 198.8, 163.8], mbArabicCellSizes, 'rtl'), total: box(47, 108, 230, 44, 32, 'center', 'ltr') },
  },
}
