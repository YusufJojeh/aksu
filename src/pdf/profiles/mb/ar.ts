import { box } from '../shared/fieldBox'
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
// As with de.ts, the two tables' column dividers are NOT identical: the second table's outer
// border and every internal divider sit a uniform 6pt further left than the first table's (an
// artwork quirk shared with de.ts's second table), so each visit gets its own row-builder with
// independently measured column positions. Row y-positions, however, are pixel-identical to
// de.ts's for both visits — this template shares the same page grid, only column widths and the
// RTL column order differ.
const firstVisitRow = (y: number) => ({
  treatment: box(416, y, 143, 18, 10, 'right' as const, 'rtl' as const),
  quantity: box(322, y, 82, 18, 10, 'center' as const, 'rtl' as const),
  quality: box(213, y, 97, 18, 9, 'center' as const, 'rtl' as const),
  unitPrice: box(108, y, 93, 18, 9, 'center' as const, 'rtl' as const),
  total: box(34, y, 62, 18, 9, 'center' as const, 'rtl' as const),
})

const secondVisitRow = (y: number) => ({
  treatment: box(416, y, 137, 18, 10, 'right' as const, 'rtl' as const),
  quantity: box(326, y, 78, 18, 10, 'center' as const, 'rtl' as const),
  quality: box(213, y, 101, 18, 9, 'center' as const, 'rtl' as const),
  unitPrice: box(130, y, 71, 18, 9, 'center' as const, 'rtl' as const),
  total: box(28, y, 90, 18, 9, 'center' as const, 'rtl' as const),
})

export const arMbPdfCoordinates: MbPdfCoordinates = {
  cover: {
    patientName: box(37, 398, 120, 18, 12, 'center', 'rtl'),
    reportDate: box(37, 335, 158, 18, 12, 'center', 'rtl'),
    age: box(37, 267, 165, 18, 12, 'center', 'rtl'),
    patientId: box(37, 212, 108, 18, 12, 'center', 'rtl'),
    phone: box(37, 148, 152, 18, 12, 'center', 'ltr'),
  },
  oralHealth: {
    currentCondition: {
      missingTeeth: { x: 283.4, y: 671.6 }, looseTeeth: { x: 283.4, y: 639.7 }, gumInfectionOrDisease: { x: 283.4, y: 611.1 },
      crowdedOrCrookedTeeth: { x: 283.4, y: 584.4 }, toothDecayOrBrokenTeeth: { x: 283.4, y: 555.1 }, teethGrindingOrClenching: { x: 283.4, y: 524.4 },
      biteOrJawProblems: { x: 283.4, y: 492.6 }, aestheticToothDefects: { x: 283.4, y: 463.2 },
    },
    recommendedTreatments: {
      dentalImplants: { x: 543.9, y: 338.4 }, dentalFillings: { x: 543.9, y: 306.6 }, zirconiaCrowns: { x: 543.9, y: 277.7 },
      emaxVeneers: { x: 543.9, y: 248.4 }, boneGrafting: { x: 543.9, y: 219.1 }, sinusLift: { x: 543.9, y: 187.2 },
      deepCleaning: { x: 543.9, y: 157.9 }, rootCanalTreatment: { x: 543.9, y: 128.7 },
    },
  },
  treatmentPlan: {
    firstVisit: { rows: [640.6, 613.4, 586.1, 559.1, 532.1, 505.1].map(firstVisitRow), total: box(49, 448, 230, 22, 14, 'center', 'rtl') },
    secondVisit: { rows: [320.3, 292.9, 265.9, 238.9, 211.8, 184.8].map(secondVisitRow), total: box(47, 126, 230, 22, 14, 'center', 'rtl') },
  },
}
