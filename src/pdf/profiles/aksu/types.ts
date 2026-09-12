import type { AssessmentKey } from '../../../domain/report'
import type { FieldBox, TreatmentRowBoxes } from '../shared/fieldBox'

export interface AksuPdfCoordinates {
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
