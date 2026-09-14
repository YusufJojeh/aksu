import { box } from '../shared/fieldBox'
import type { AksuPdfCoordinates } from './types'

export const enPdfCoordinates: AksuPdfCoordinates = {
  page1: {
    reportDate: box(91, 395, 215, 24, 13, 'center'),
    patientName: box(91, 354, 215, 28, 13, 'center'),
    age: box(68, 320, 238, 27, 13, 'center'),
    phone: box(91, 283, 215, 27, 13, 'center'),
  },
  page2: {
    assessment: {
      existingDentalImplants: { x: 57, y: 666 }, existingDentalRestorations: { x: 57, y: 646 },
      teethRelativelyAligned: { x: 57, y: 626 }, gingivalInflammation: { x: 57, y: 606 },
      dentalCaries: { x: 278, y: 666 }, malocclusion: { x: 278, y: 646 }, toothWear: { x: 278, y: 626 }, missingTeeth: { x: 278, y: 606 },
      dentalAbscesses: { x: 426, y: 666 }, gingivalRecession: { x: 426, y: 646 }, dentalCrowding: { x: 426, y: 626 }, boneResorption: { x: 426, y: 606 },
    },
    firstVisit: {
      rows: [509, 490, 470, 450, 427, 400, 377].map((y) => ({
        treatment: box(48, y, 142, 18, 14), quality: box(192, y, 81, 18, 11, 'center'), quantity: box(275, y, 82, 18, 12, 'center'), unitPrice: box(359, y, 112, 18, 12, 'center'), total: box(473, y, 88, 18, 12, 'center'),
      })),
      total: box(451, 349, 105, 23, 15, 'center'),
    },
    discount: { sentence: box(43, 326, 285, 22, 9), price: box(331, 326, 232, 23, 15, 'center') },
    secondVisit: {
      heading: box(56, 286, 505, 28, 14, 'center'),
      rows: [243, 224, 203, 184, 163, 142, 113].map((y) => ({
        treatment: box(45, y, 138, 18, 13), quality: box(184, y, 80, 18, 11, 'center'), quantity: box(266, y, 68, 18, 12, 'center'), unitPrice: box(336, y, 127, 18, 12, 'center'), total: box(465, y, 96, 18, 12, 'center'),
      })),
      total: box(452, 92, 105, 23, 15, 'center'),
    },
  },
}
