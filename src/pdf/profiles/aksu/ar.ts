import { box } from '../shared/fieldBox'
import type { AksuPdfCoordinates } from './types'

const arabicRow = (y: number) => ({
  treatment: box(409, y, 151, 18, 14, 'right', 'rtl'),
  quality: box(325, y, 81, 18, 13, 'center', 'rtl'),
  quantity: box(241, y, 81, 18, 13, 'center', 'rtl'),
  unitPrice: box(127, y, 111, 18, 15, 'center', 'rtl'),
  total: box(37, y, 87, 18, 15, 'center', 'rtl'),
})

export const arPdfCoordinates: AksuPdfCoordinates = {
  page1: {
    reportDate: box(54, 392, 211, 23, 13, 'center', 'rtl'),
    patientName: box(54, 353, 211, 26, 13, 'center', 'rtl'),
    age: box(54, 316, 211, 25, 13, 'center', 'rtl'),
    phone: box(54, 278, 211, 25, 13, 'center', 'ltr'),
  },
  page2: {
    assessment: {
      dentalAbscesses: { x: 187.1, y: 669.6 },
      dentalCrowding: { x: 187.1, y: 649.7 },
      toothWear: { x: 187.1, y: 629.8 },
      malocclusion: { x: 187.1, y: 609.9 },
      existingDentalImplants: { x: 348.4, y: 669.6 },
      existingDentalRestorations: { x: 348.4, y: 649.7 },
      teethRelativelyAligned: { x: 348.4, y: 629.8 },
      dentalCaries: { x: 348.4, y: 609.9 },
      missingTeeth: { x: 547.1, y: 669.6 },
      boneResorption: { x: 547.1, y: 649.7 },
      gingivalRecession: { x: 547.1, y: 629.8 },
      gingivalInflammation: { x: 547.1, y: 609.9 },
    },
    firstVisit: {
      rows: [501, 481, 461, 441, 421, 401, 381].map(arabicRow),
      total: box(37, 357, 238, 20, 12, 'center', 'rtl'),
    },
    discount: {
      sentence: box(277, 331, 285, 28, 14, 'center', 'rtl'),
      price: box(37, 331, 238, 28, 13, 'center', 'rtl'),
    },
    secondVisit: {
      heading: box(56, 279, 505, 32, 14, 'center', 'rtl'),
      rows: [233, 214, 194, 174, 154, 134, 114].map(arabicRow),
      total: box(37, 90, 241, 22, 12, 'center', 'rtl'),
    },
    secondDiscount: {
      sentence: box(277, 64, 285, 28, 14, 'center', 'rtl'),
      price: box(37, 64, 238, 28, 13, 'center', 'rtl'),
    },
  },
}
