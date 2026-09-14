import { box } from '../shared/fieldBox'
import { mbLatinCellSizes, mbTableRows } from './table'
import type { MbPdfCoordinates } from './types'

// Cover-page fields are calibrated against the real supplied French template (measured directly
// from its embedded text-object positions). The row heights match en.ts, but the French labels
// ("IDENTIFIANT DU PATIENT" especially) print wider than their English equivalents, so the value
// boxes here start further right per field rather than reusing en.ts's x positions verbatim.
//
// Every box's right edge is capped at x=290: the cover photo's real left edge sits at x≈297
// (measured directly, identical across all three Latin templates), and dynamic text drawn past
// that point becomes illegible against the dark photo even though it renders — plain black text
// over a busy dark-marble background just disappears visually. Keeping every box clear of that
// boundary lets fitTextToBox's own shrink-to-fit take over for long values instead of letting
// them silently bleed into the photo.
//
// Oral-health circle marks are calibrated against the real template artwork (checkbox squares
// measured directly from the rendered PDF pixels).
//
// Treatment-table cells are NOT shared with en.ts: the French artwork's first table has its own
// grid (dividers at x=229.8/308.6/401.2/476.4, row lines at y=622.3/595.0/568.0/541.0/513.5, header
// bottom 649.0, bottom border 485.3 — measured at 4x, matching SERGIO ALMEIDO.pdf). The second
// visit prints only an empty placeholder frame whose left edge sits 6pt further left (x=22.2, the
// same shift as the other templates' second tables), so it reuses these columns shifted by 6pt
// and the shared MB second-table row lines.
const firstVisitColumns = {
  treatment: [28.4, 229.8], quality: [229.8, 308.6], quantity: [308.6, 401.2], unitPrice: [401.2, 476.4], total: [476.4, 565.8],
} as const
const secondVisitColumns = {
  treatment: [22.4, 223.8], quality: [223.8, 302.6], quantity: [302.6, 395.2], unitPrice: [395.2, 470.4], total: [470.4, 559.8],
} as const

export const frMbPdfCoordinates: MbPdfCoordinates = {
  cover: {
    patientName: box(80, 276, 112, 42, 16),
    reportDate: box(90, 373, 112, 23, 16),
    age: box(82, 229, 92, 23, 16),
    patientId: box(88, 43, 92, 25, 18),
    phone: box(82, 112, 126, 23, 16),
  },
  oralHealth: {
    currentCondition: {
      missingTeeth: { x: 50, y: 662.9 }, looseTeeth: { x: 50, y: 632.9 }, gumInfectionOrDisease: { x: 50, y: 602.9 },
      crowdedOrCrookedTeeth: { x: 50, y: 572.9 }, toothDecayOrBrokenTeeth: { x: 50, y: 542.9 }, teethGrindingOrClenching: { x: 50, y: 512.9 },
      biteOrJawProblems: { x: 50, y: 482.9 }, aestheticToothDefects: { x: 50, y: 452.9 },
    },
    recommendedTreatments: {
      dentalExtractions: { x: 297.5, y: 329.4 },
      dentalImplants: { x: 297.5, y: 299.4 }, dentalFillings: { x: 297.5, y: 299.4 }, zirconiaCrowns: { x: 297.5, y: 269.4 },
      emaxVeneers: { x: 297.5, y: 239.4 }, boneGrafting: { x: 297.5, y: 209.4 }, sinusLift: { x: 297.5, y: 179.4 },
      deepCleaning: { x: 297.5, y: 149.4 }, rootCanalTreatment: { x: 297.5, y: 119.4 },
    },
  },
  treatmentPlan: {
    firstVisit: { rows: mbTableRows(firstVisitColumns, [649.0, 622.3, 595.0, 568.0, 541.0, 513.5, 485.3], mbLatinCellSizes), total: box(320, 439, 230, 32, 20, 'center') },
    secondVisit: { rows: mbTableRows(secondVisitColumns, [335.0, 307.5, 280.5, 253.3, 226.3, 199.2, 164.0], mbLatinCellSizes), total: box(315, 119, 230, 32, 20, 'center') },
  },
}
