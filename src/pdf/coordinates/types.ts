import type { AssessmentKey } from '../../domain/report'

export type Direction = 'ltr' | 'rtl'
export type Alignment = 'left' | 'center' | 'right'

export interface FieldBox {
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  minFontSize?: number
  alignment: Alignment
  direction?: Direction
}

export interface TreatmentRowBoxes {
  treatment: FieldBox
  quality: FieldBox
  quantity: FieldBox
  unitPrice: FieldBox
  total: FieldBox
}

export interface PdfCoordinates {
  page1: {
    reportDate: FieldBox
    patientName: FieldBox
    age: FieldBox
    phone: FieldBox
  }
  page2: {
    assessment: Record<AssessmentKey, { x: number; y: number }>
    firstVisit: { rows: TreatmentRowBoxes[]; total: FieldBox }
    discount: { sentence: FieldBox; price: FieldBox }
    secondVisit: { heading: FieldBox; rows: TreatmentRowBoxes[]; total: FieldBox }
  }
}

export const box = (
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize: number,
  alignment: Alignment = 'left',
  direction?: Direction,
): FieldBox => ({ x, y, width, height, fontSize, minFontSize: 6, alignment, direction })
