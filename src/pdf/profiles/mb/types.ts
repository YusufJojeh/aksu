import type { MbConditionKey, MbRecommendedTreatmentKey } from '../../../domain/report'
import type { CheckboxBox } from './checkbox'
import type { FieldBox, TreatmentRowBoxes } from '../shared/fieldBox'

export type { CheckboxBox } from './checkbox'

export interface MbPdfCoordinates {
  cover: {
    reportDate: FieldBox
    patientName: FieldBox
    age: FieldBox
    patientId: FieldBox
    phone: FieldBox
  }
  oralHealth: {
    currentCondition: Record<MbConditionKey, CheckboxBox>
    // Partial: a locale's artwork only prints the rows it prints. Keys with no square are skipped.
    recommendedTreatments: Partial<Record<MbRecommendedTreatmentKey, CheckboxBox>>
  }
  treatmentPlan: {
    firstVisit: { rows: TreatmentRowBoxes[]; total: FieldBox }
    secondVisit: { rows: TreatmentRowBoxes[]; total: FieldBox }
  }
}
