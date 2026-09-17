import type { AssessmentKey } from '../../../domain/report'
import type { FieldBox, TreatmentRowBoxes } from '../shared/fieldBox'
import type { AksuTableGrid } from './table'

export type { AksuTableGrid } from './table'

export interface AksuPdfCoordinates {
  page1: {
    reportDate: FieldBox
    patientName: FieldBox
    age: FieldBox
    phone: FieldBox
  }
  page2: {
    assessment: Record<AssessmentKey, { x: number; y: number }>
    // `grid` is the artwork's own printed rules. Templates whose treatment column is pre-filled
    // have those cells cleared before values are drawn, which wipes the rules with them, so the
    // profile carries the geometry needed to put them back exactly where the artwork had them.
    firstVisit: { rows: TreatmentRowBoxes[]; total: FieldBox; grid?: AksuTableGrid }
    discount: { sentence: FieldBox; price: FieldBox }
    secondVisit: { heading: FieldBox; rows: TreatmentRowBoxes[]; total: FieldBox; grid?: AksuTableGrid }
    // Every template prints the same blank gold gradient bar under the second table's Total row as
    // under the first (measured directly off each artwork's page 2), so the second visit gets the
    // identical discount-box treatment as the first.
    secondDiscount: { sentence: FieldBox; price: FieldBox }
  }
}
