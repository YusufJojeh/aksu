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
// TODO(calibration): the oral-health circle marks and treatment-plan table cells below are still
// placeholder positions pending real calibration.
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
const treatmentRow = (y: number) => ({
  treatment: box(48, y, 142, 18, 11),
  quality: box(192, y, 81, 18, 9, 'center' as const),
  quantity: box(275, y, 60, 18, 10, 'center' as const),
  unitPrice: box(337, y, 112, 18, 10, 'center' as const),
  total: box(451, y, 100, 18, 10, 'center' as const),
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
      missingTeeth: { x: 60, y: 700 }, looseTeeth: { x: 60, y: 670 }, gumInfectionOrDisease: { x: 60, y: 640 },
      crowdedOrCrookedTeeth: { x: 60, y: 610 }, toothDecayOrBrokenTeeth: { x: 60, y: 580 }, teethGrindingOrClenching: { x: 60, y: 550 },
      biteOrJawProblems: { x: 60, y: 520 }, aestheticToothDefects: { x: 60, y: 490 },
    },
    recommendedTreatments: {
      dentalImplants: { x: 420, y: 430 }, dentalFillings: { x: 420, y: 400 }, zirconiaCrowns: { x: 420, y: 370 },
      emaxVeneers: { x: 420, y: 340 }, boneGrafting: { x: 420, y: 310 }, sinusLift: { x: 420, y: 280 },
      deepCleaning: { x: 420, y: 250 }, rootCanalTreatment: { x: 420, y: 220 },
    },
  },
  treatmentPlan: {
    firstVisit: { rows: [560, 530, 500, 470, 440, 410].map(treatmentRow), total: box(451, 590, 100, 22, 14, 'center') },
    secondVisit: { rows: [300, 270, 240, 210, 180, 150].map(treatmentRow), total: box(451, 330, 100, 22, 14, 'center') },
  },
}
