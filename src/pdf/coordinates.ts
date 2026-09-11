import type { Locale } from '../domain/report'
import { arPdfCoordinates } from './coordinates/ar'
import { enPdfCoordinates } from './coordinates/en'

export type { Alignment, Direction, FieldBox, PdfCoordinates, TreatmentRowBoxes } from './coordinates/types'

export const pdfCoordinatesByLocale = { en: enPdfCoordinates, ar: arPdfCoordinates } as const

export function coordinatesForTemplate(locale: Locale) {
  return locale === 'ar' ? arPdfCoordinates : enPdfCoordinates
}

export const pdfCoordinates = enPdfCoordinates

export type CoordinateField = 'page1.reportDate' | 'page1.patientName' | 'page1.age' | 'page1.phone'
