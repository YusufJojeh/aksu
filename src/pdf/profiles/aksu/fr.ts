import { box } from '../shared/fieldBox'
import { aksuVisitTable } from './table'
import type { AksuPdfCoordinates } from './types'

// Calibrated against the clinic's canonical French artwork (`emir aksu french finalllllllllll.pdf`,
// bundled as public/templates/aksu/fr.pdf via scripts/optimize_aksu_template.py). Every number here
// was read out of that PDF's own vector objects — the navy diagnostic circles, the printed table
// rules and the field underlines on page 1 — never carried over from another locale.
//
// French and Spanish are NOT the same geometry and must not share a profile: the first-visit header
// bar sits at y=525.3-548.7 here and at y=516.3-539.7 in Spanish, the page-1 rules end at x=344.7
// here and x=314.5 there, and the first diagnostic column sits at x=51.3 here and x=57.3 there.
//
// The diagnostic list's printed order differs from the English artwork too — reading down the first
// column the French page prints "Perte partielle ou totale des dents" first, where Spanish prints
// "Restauraciones dentales existentes" — so each key is mapped to the circle beside its own label.
//
// The column dividers are identical for both visits apart from a uniform 5.1pt leftward shift in
// the second table (188.3/270.9/355.3/468.6 versus 183.2/265.8/350.2/463.5), which is a real quirk
// of the artwork, measured on every divider.
const firstVisit = aksuVisitTable(
  [37.1, 188.3, 270.9, 355.3, 468.6, 559.2],
  [524.8, 509.3, 488.3, 467.4, 446.4, 425.7, 404.8, 384.0],
)
const secondVisit = aksuVisitTable(
  [37.1, 183.2, 265.8, 350.2, 463.5, 559.2],
  [269.3, 250.8, 229.9, 208.9, 189.7, 166.7, 142.2, 117.6],
)

export const frPdfCoordinates: AksuPdfCoordinates = {
  // Page 1 prints a label and a rule per field; each value sits on its own rule, from just right of
  // the rule's left end to its right end. Rules measured at y=407.5 / 368.9 / 332.7 / 301.4; each box
  // starts at its rule's own y, which puts the baseline ~3pt clear of the rule.
  page1: {
    reportDate: box(78, 407.5, 262, 20, 14, 'center'),
    patientName: box(78, 368.9, 262, 20, 14, 'center'),
    age: box(73, 332.7, 267, 20, 14, 'center'),
    phone: box(118, 301.4, 222, 20, 14, 'center'),
  },
  page2: {
    // Circle centres, measured from the artwork's own navy outlines (15.3-16.0pt diameter).
    assessment: {
      missingTeeth: { x: 51.3, y: 659.0 }, existingDentalRestorations: { x: 51.3, y: 637.9 },
      existingDentalImplants: { x: 51.3, y: 618.4 }, teethRelativelyAligned: { x: 51.3, y: 599.6 },
      dentalCrowding: { x: 278.3, y: 659.3 }, toothWear: { x: 278.3, y: 638.9 },
      boneResorption: { x: 278.3, y: 620.0 }, gingivalRecession: { x: 278.3, y: 601.9 },
      dentalAbscesses: { x: 425.9, y: 659.3 }, gingivalInflammation: { x: 425.9, y: 639.1 },
      malocclusion: { x: 425.9, y: 620.4 }, dentalCaries: { x: 425.9, y: 602.5 },
    },
    firstVisit: { ...firstVisit, total: box(324.7, 360.6, 234.5, 23.4, 18, 'center') },
    // The gold gradient bar under the first table is blank in this artwork (English prints its
    // discount sentence into it), so nothing is cleared here — see `clearDiscountRegion` in index.ts.
    discount: { sentence: box(43, 335.5, 275, 21.2, 9), price: box(324.7, 333.5, 234.5, 25.2, 18, 'center') },
    secondVisit: {
      // The artwork already prints "Deuxième visite (après 6–3 mois):" (measured band below), so the
      // generator leaves it alone; this box exists only to satisfy the shared profile shape.
      heading: box(163.3, 298.4, 275.6, 17.7, 16, 'center'),
      ...secondVisit,
      total: box(323.3, 94.2, 235.9, 23.4, 18, 'center'),
    },
  },
}
