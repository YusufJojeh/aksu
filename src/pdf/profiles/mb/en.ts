import { box } from '../shared/fieldBox'
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
// the same place regardless of which language's labels reflow around them).
const treatmentRow = (y: number) => ({
  treatment: box(34, y, 190, 18, 11),
  quality: box(236, y, 86, 18, 9, 'center' as const),
  quantity: box(332, y, 43, 18, 10, 'center' as const),
  unitPrice: box(385, y, 85, 18, 10, 'center' as const),
  total: box(482, y, 77, 18, 10, 'center' as const),
})

export const enMbPdfCoordinates: MbPdfCoordinates = {
  cover: {
    patientName: box(188, 403.5, 102, 19, 13),
    reportDate: box(132, 334, 158, 19, 13),
    age: box(124, 264.6, 166, 19, 13),
    patientId: box(165, 203.4, 125, 19, 13),
    phone: box(149, 142.5, 141, 19, 13),
  },
  oralHealth: {
    currentCondition: {
      missingTeeth: { x: 50, y: 662.9 }, looseTeeth: { x: 50, y: 632.9 }, gumInfectionOrDisease: { x: 50, y: 602.9 },
      crowdedOrCrookedTeeth: { x: 50, y: 572.9 }, toothDecayOrBrokenTeeth: { x: 50, y: 542.9 }, teethGrindingOrClenching: { x: 50, y: 512.9 },
      biteOrJawProblems: { x: 50, y: 482.9 }, aestheticToothDefects: { x: 50, y: 452.9 },
    },
    recommendedTreatments: {
      dentalExtractions: { x: 297.5, y: 329.4 },
      dentalImplants: { x: 297.5, y: 329.4 }, dentalFillings: { x: 297.5, y: 299.4 }, zirconiaCrowns: { x: 297.5, y: 269.4 },
      emaxVeneers: { x: 297.5, y: 239.4 }, boneGrafting: { x: 297.5, y: 209.4 }, sinusLift: { x: 297.5, y: 179.4 },
      deepCleaning: { x: 297.5, y: 149.4 }, rootCanalTreatment: { x: 297.5, y: 119.4 },
    },
  },
  treatmentPlan: {
    firstVisit: { rows: [632.8, 605.8, 578.8, 551.8, 524.4, 497.4].map(treatmentRow), total: box(320, 444, 230, 22, 14, 'center') },
    secondVisit: { rows: [312.4, 285.4, 258.1, 231.1, 204.1, 177.1].map(treatmentRow), total: box(315, 124, 230, 22, 14, 'center') },
  },
}
