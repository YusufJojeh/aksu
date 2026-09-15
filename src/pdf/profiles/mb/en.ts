import { box } from '../shared/fieldBox'
import { checkboxColumn, mbConditionRowOrder, mbRecommendedRowOrderLatin } from './checkbox'
import { mbEnglishCellSizes, mbTableRows } from './table'
import type { MbPdfCoordinates } from './types'

// Cover-page fields are calibrated against the real supplied English template (measured directly
// from its embedded text-object positions: each value box starts just right of its own printed
// label). Every box's right edge is capped at x=290: the cover photo's real left edge sits at
// x≈297 (measured directly), and dynamic text drawn past that point becomes illegible against
// the dark photo even though it renders — plain black text over a busy dark-marble background
// just disappears visually. Keeping every box clear of that boundary lets fitTextToBox's own
// shrink-to-fit take over for long values instead of letting them silently bleed into the photo.
//
// Oral-health circle marks and treatment-plan table cells below are calibrated against the real
// template artwork: checkbox squares and table gridlines were measured directly from the rendered
// PDF pixels (fixed, locale-independent positions — the same physical squares/gridlines print in
// the same place regardless of which language's labels reflow around them). Table cells are the
// real gridline-bounded cells (re-measured at 4x); the second table sits 6pt further left.
// This template's MediaBox starts at y=7.83 (not 0), and pdf-lib draws in raw PDF user space, so
// row edges measured from the rendered page are shifted by that origin.
const MEDIA_BOX_Y = 7.83
const pdfRowEdges = (edges: number[]) => edges.map((y) => y + MEDIA_BOX_Y)
const firstVisitColumns = {
  treatment: [28.1, 230.1], quality: [230.1, 327.9], quantity: [327.9, 378.9], unitPrice: [378.9, 476.4], total: [476.4, 565.4],
} as const
const secondVisitColumns = {
  treatment: [22.1, 224.1], quality: [224.1, 321.9], quantity: [321.9, 373.0], unitPrice: [373.0, 470.5], total: [470.5, 559.5],
} as const
// Checkbox squares are measured directly from this artwork's own gold outlines, in pdf-lib user
// space — see profiles/mb/checkbox.ts and scripts/measure_mb_checkboxes.py. en.pdf and de.pdf are
// byte-identical apart from their printed labels, so both import these squares.
export const enConditionColumn = checkboxColumn(mbConditionRowOrder, 50.2, [
  [670.62, 12.60, 13.08], [638.76, 12.60, 13.08], [610.04, 12.60, 13.08], [583.36, 12.60, 13.08],
  [554.17, 12.60, 13.08], [523.43, 12.60, 13.08], [491.59, 12.60, 13.08], [462.27, 12.60, 13.08],
])

export const enRecommendedColumn = checkboxColumn(mbRecommendedRowOrderLatin, 297.47, [
  [337.05, 13.75, 14.28], [305.25, 13.75, 14.28], [276.34, 13.75, 14.28], [247.06, 13.75, 14.28],
  [217.79, 13.75, 14.28], [185.88, 13.75, 14.28], [156.61, 13.75, 14.28], [127.34, 13.75, 14.28],
])

export const enMbPdfCoordinates: MbPdfCoordinates = {
  cover: {
    patientName: box(188, 403.5, 102, 19, 13),
    reportDate: box(132, 334, 158, 19, 13),
    age: box(124, 264.6, 166, 19, 13),
    patientId: box(165, 203.4, 125, 19, 13),
    phone: box(149, 142.5, 141, 19, 13),
  },
  oralHealth: {
    currentCondition: enConditionColumn,
    recommendedTreatments: enRecommendedColumn,
  },
  treatmentPlan: {
    // The gold TOTAL pill itself (measured directly from the rendered artwork, gridline-scan at
    // 200dpi) spans x=307.1-564.8, y=432.2-478.6 (first visit) and x=301.0-559.1, y=111.8-158.3
    // (second visit) — a 46-47pt-tall pill, over twice the 22pt this box previously used, which
    // left the total looking far smaller than the table's own 21pt cell text. Boxes below inset
    // that real pill by ~10pt horizontally / ~5pt vertically for padding; drawCenteredCell (with
    // VISIT_TOTAL_PADDING) centers the big preferred size inside on real glyph/font metrics.
    firstVisit: { rows: mbTableRows(firstVisitColumns, pdfRowEdges([655.5, 628.0, 601.0, 573.8, 546.8, 519.7, 484.5]), mbEnglishCellSizes), total: box(317, 437, 238, 36, 26, 'center', undefined, 18) },
    secondVisit: { rows: mbTableRows(secondVisitColumns, pdfRowEdges([335.0, 307.5, 280.5, 253.3, 226.3, 199.2, 164.0]), mbEnglishCellSizes), total: box(311, 117, 238, 36, 26, 'center', undefined, 18) },
  },
}
