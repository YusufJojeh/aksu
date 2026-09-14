import { box } from '../shared/fieldBox'
import { mbLatinCellSizes, mbTableRows } from './table'
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
// This template's MediaBox starts at y=7.83 (not 0), and pdf-lib draws in raw PDF user space, so
// row edges measured from the rendered page are shifted by that origin.
const MEDIA_BOX_Y = 7.83
const pdfRowEdges = (edges: number[]) => edges.map((y) => y + MEDIA_BOX_Y)
const firstVisitColumns = {
  treatment: [28.1, 230.1], quality: [230.1, 327.9], quantity: [327.9, 401.4], unitPrice: [401.4, 476.4], total: [476.4, 565.4],
} as const
const secondVisitColumns = {
  treatment: [22.1, 224.1], quality: [224.1, 321.9], quantity: [321.9, 402.0], unitPrice: [402.0, 470.5], total: [470.5, 559.5],
} as const

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
      dentalExtractions: { x: 297.3, y: 337.2 },
      dentalImplants: { x: 297.3, y: 337.2 }, dentalFillings: { x: 297.3, y: 305.6 }, zirconiaCrowns: { x: 297.3, y: 276.6 },
      emaxVeneers: { x: 297.3, y: 247.2 }, boneGrafting: { x: 297.3, y: 218.1 }, sinusLift: { x: 297.3, y: 186.1 },
      deepCleaning: { x: 297.3, y: 156.9 }, rootCanalTreatment: { x: 297.3, y: 127.6 },
    },
  },
  treatmentPlan: {
    firstVisit: { rows: mbTableRows(firstVisitColumns, pdfRowEdges([655.5, 628.0, 601.0, 573.8, 546.8, 519.7, 484.5]), mbLatinCellSizes), total: box(321, 452, 230, 22, 14, 'center') },
    secondVisit: { rows: mbTableRows(secondVisitColumns, pdfRowEdges([335.0, 307.5, 280.5, 253.3, 226.3, 199.2, 164.0]), mbLatinCellSizes), total: box(315, 132, 230, 22, 14, 'center') },
  },
}
