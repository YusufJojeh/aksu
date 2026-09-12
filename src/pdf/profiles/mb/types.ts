import type { MbConditionKey, MbRecommendedTreatmentKey } from '../../../domain/report'
import type { FieldBox, TreatmentRowBoxes } from '../shared/fieldBox'

export interface MbPdfCoordinates {
  cover: {
    reportDate: FieldBox
    patientName: FieldBox
    age: FieldBox
    patientId: FieldBox
    phone: FieldBox
  }
  oralHealth: {
    currentCondition: Record<MbConditionKey, { x: number; y: number }>
    recommendedTreatments: Record<MbRecommendedTreatmentKey, { x: number; y: number }>
  }
  treatmentPlan: {
    firstVisit: { rows: TreatmentRowBoxes[]; total: FieldBox }
    secondVisit: { rows: TreatmentRowBoxes[]; total: FieldBox }
  }
}
