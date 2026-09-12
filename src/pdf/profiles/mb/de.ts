import { box } from '../shared/fieldBox'
import type { MbPdfCoordinates } from './types'

// Cover-page fields are calibrated against the real supplied German template (measured directly
// from its embedded text-object positions). German labels ("PATIENTENIDENTIFIKATOR" especially)
// print wider than English/French, so the value boxes start further right per field.
//
// Every value box's right edge is capped at x=290, not the page's right margin: the cover
// photo's real left edge sits at x≈297 (measured directly, identical across all three Latin
// templates), and dynamic text drawn past that point becomes illegible against the dark photo
// even though it renders — plain black text over a busy dark-marble background just disappears
// visually. Keeping every box clear of that boundary lets fitTextToBox's own shrink-to-fit take
// over for long values instead of letting them silently bleed into the photo.
//
// Oral-health circle marks and treatment-plan table cells below are calibrated against the real
// template artwork: checkbox squares and table gridlines were measured directly from the rendered
// PDF pixels (render at scale=3, pixel-scan for gridline/checkbox bounding boxes, convert back to
// PDF points). Unlike en.ts/fr.ts, the two treatment tables here do NOT share one column layout:
// the second table's outer border and all 5 column dividers measure a uniform 6pt further left
// than the first table's (18px at the render scale, confirmed identical across every divider and
// both outer borders — a real quirk of this artwork, not measurement noise), so firstVisit and
// secondVisit each get their own row-builder with independently measured column positions.
//
// ANOMALY (source artwork, not a bug — do not "fix"): the German template's treatment-table
// header row is mistranslated/reordered relative to EN/FR. EN/FR read
// Treatment | Material | Qty | Unit Price | Total, but the German artwork's printed headers
// read Behandlung | Menge (Quantity) | Materialpreis (Material Price) | unitarisch | Gesamt —
// column 2 and 3 are swapped labels vs. EN/FR. Per spec, static clinic artwork is immutable, so
// the printed German labels are left exactly as supplied. The dynamic values below still target
// the same PHYSICAL column positions as en.ts/fr.ts (col 2 = quality/material, col 3 = quantity),
// matching what each column visually contains in every other locale, not what the German label
// happens to say.
const firstVisitRow = (y: number) => ({
  treatment: box(34, y, 190, 18, 11),
  quality: box(236, y, 86, 18, 9, 'center' as const),
  quantity: box(334, y, 62, 18, 10, 'center' as const),
  unitPrice: box(407, y, 63, 18, 10, 'center' as const),
  total: box(482, y, 77, 18, 10, 'center' as const),
})

const secondVisitRow = (y: number) => ({
  treatment: box(28, y, 190, 18, 11),
  quality: box(230, y, 86, 18, 9, 'center' as const),
  quantity: box(328, y, 68, 18, 10, 'center' as const),
  unitPrice: box(408, y, 56, 18, 10, 'center' as const),
  total: box(476, y, 77, 18, 10, 'center' as const),
})

export const deMbPdfCoordinates: MbPdfCoordinates = {
  cover: {
    patientName: box(219, 400.2, 71, 19, 13),
    reportDate: box(145, 334, 145, 19, 13),
    age: box(138, 263.2, 152, 19, 13),
    patientId: box(253, 202.7, 37, 19, 13),
    phone: box(157, 141.4, 133, 19, 13),
  },
  oralHealth: {
    currentCondition: {
      missingTeeth: { x: 50, y: 670.9 }, looseTeeth: { x: 50, y: 639.1 }, gumInfectionOrDisease: { x: 50, y: 610.4 },
      crowdedOrCrookedTeeth: { x: 50, y: 583.7 }, toothDecayOrBrokenTeeth: { x: 50, y: 554.6 }, teethGrindingOrClenching: { x: 50, y: 523.7 },
      biteOrJawProblems: { x: 50, y: 491.9 }, aestheticToothDefects: { x: 50, y: 462.6 },
    },
    recommendedTreatments: {
      dentalImplants: { x: 297.3, y: 337.2 }, dentalFillings: { x: 297.3, y: 305.6 }, zirconiaCrowns: { x: 297.3, y: 276.6 },
      emaxVeneers: { x: 297.3, y: 247.2 }, boneGrafting: { x: 297.3, y: 218.1 }, sinusLift: { x: 297.3, y: 186.1 },
      deepCleaning: { x: 297.3, y: 156.9 }, rootCanalTreatment: { x: 297.3, y: 127.6 },
    },
  },
  treatmentPlan: {
    firstVisit: { rows: [640.6, 613.4, 586.1, 559.1, 532.1, 505.1].map(firstVisitRow), total: box(321, 452, 230, 22, 14, 'center') },
    secondVisit: { rows: [320.3, 292.9, 265.9, 238.9, 211.8, 184.8].map(secondVisitRow), total: box(315, 132, 230, 22, 14, 'center') },
  },
}
