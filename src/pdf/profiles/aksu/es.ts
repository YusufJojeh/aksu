import { box } from '../shared/fieldBox'
import { aksuVisitTable } from './table'
import type { AksuPdfCoordinates } from './types'

// Calibrated against the clinic's canonical Spanish artwork (`emir aksu Spanish edit3
// finalllllllllll111.pdf`, bundled as public/templates/aksu/es.pdf via
// scripts/optimize_aksu_template.py). Measured independently of fr.ts — see the note there for the
// measurements that prove the two locales do not share page geometry.
//
// The diagnostic list's printed order differs from both English and French: reading down, column 1
// is Restauraciones / Implantes / Pérdida parcial o total / Dientes relativamente alineados, and
// column 3 leads with "Gingivitis" then "Infecciones", the reverse of the French column. Each key is
// mapped to the circle beside its own label.
//
// Column dividers match the French artwork exactly (same Illustrator table, only the labels and the
// vertical rhythm were re-set), including the uniform 5.1pt leftward shift of the second table. The
// row rules do NOT match: every Spanish row sits ~9pt lower on the first table and ~17pt lower on
// the second, so both row sets are measured from this file's own artwork.
const firstVisit = aksuVisitTable(
  [36.7, 188.3, 270.9, 355.3, 468.6, 558.8],
  [515.8, 500.3, 479.3, 458.4, 437.4, 418.0, 396.5, 375.0],
)
const secondVisit = aksuVisitTable(
  [36.7, 183.2, 265.8, 350.2, 463.5, 558.8],
  [252.3, 233.8, 212.9, 191.9, 172.7, 151.8, 131.3, 111.0],
)

export const esPdfCoordinates: AksuPdfCoordinates = {
  // Rules measured at y=407.5 / 368.9 / 332.7 / 302.4; they end at x=314.5, 30pt short of the
  // French ones, so the value boxes are narrower here. Each box starts at its rule's own y, which
  // puts the baseline ~3pt clear of the rule — the value sits on the line, not floating above it.
  page1: {
    reportDate: box(85, 407.5, 225, 20, 14, 'center'),
    patientName: box(94, 368.9, 216, 20, 14, 'center'),
    age: box(81, 332.7, 229, 20, 14, 'center'),
    phone: box(120, 302.4, 190, 20, 14, 'center'),
  },
  page2: {
    assessment: {
      existingDentalRestorations: { x: 57.3, y: 659.0 }, existingDentalImplants: { x: 57.3, y: 637.9 },
      missingTeeth: { x: 57.3, y: 618.4 }, teethRelativelyAligned: { x: 57.3, y: 599.6 },
      dentalCrowding: { x: 278.3, y: 659.3 }, toothWear: { x: 278.3, y: 638.9 },
      boneResorption: { x: 278.3, y: 620.0 }, gingivalRecession: { x: 278.3, y: 601.9 },
      gingivalInflammation: { x: 425.9, y: 659.3 }, dentalAbscesses: { x: 425.9, y: 639.1 },
      malocclusion: { x: 425.9, y: 620.4 }, dentalCaries: { x: 425.9, y: 602.5 },
    },
    firstVisit: { ...firstVisit, total: box(324.7, 351.6, 234.1, 23.4, 18, 'center') },
    discount: { sentence: box(43, 326.5, 275, 21.2, 9), price: box(324.7, 324.5, 234.1, 25.2, 18, 'center') },
    secondVisit: {
      // The artwork already prints "Segunda visita (após 6–3 meses):" (measured band below).
      heading: box(147.7, 285.4, 271.4, 17.7, 16, 'center'),
      ...secondVisit,
      total: box(323.3, 88.2, 235.5, 23.4, 18, 'center'),
    },
  },
}
