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
// TODO(calibration): the oral-health circle marks and treatment-plan table cells below are
// still placeholder positions pending real calibration.
const arabicTreatmentRow = (y: number) => ({
  treatment: box(409, y, 151, 18, 10, 'right' as const, 'rtl' as const),
  quality: box(325, y, 81, 18, 9, 'center' as const, 'rtl' as const),
  quantity: box(241, y, 81, 18, 10, 'center' as const, 'rtl' as const),
  unitPrice: box(127, y, 111, 18, 9, 'center' as const, 'rtl' as const),
  total: box(37, y, 87, 18, 9, 'center' as const, 'rtl' as const),
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
      missingTeeth: { x: 420, y: 700 }, looseTeeth: { x: 420, y: 670 }, gumInfectionOrDisease: { x: 420, y: 640 },
      crowdedOrCrookedTeeth: { x: 420, y: 610 }, toothDecayOrBrokenTeeth: { x: 420, y: 580 }, teethGrindingOrClenching: { x: 420, y: 550 },
      biteOrJawProblems: { x: 420, y: 520 }, aestheticToothDefects: { x: 420, y: 490 },
    },
    recommendedTreatments: {
      dentalImplants: { x: 60, y: 430 }, dentalFillings: { x: 60, y: 400 }, zirconiaCrowns: { x: 60, y: 370 },
      emaxVeneers: { x: 60, y: 340 }, boneGrafting: { x: 60, y: 310 }, sinusLift: { x: 60, y: 280 },
      deepCleaning: { x: 60, y: 250 }, rootCanalTreatment: { x: 60, y: 220 },
    },
  },
  treatmentPlan: {
    firstVisit: { rows: [560, 530, 500, 470, 440, 410].map(arabicTreatmentRow), total: box(37, 590, 100, 22, 14, 'center', 'rtl') },
    secondVisit: { rows: [300, 270, 240, 210, 180, 150].map(arabicTreatmentRow), total: box(37, 330, 100, 22, 14, 'center', 'rtl') },
  },
}
