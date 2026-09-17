import type { AksuReportData, TreatmentRow } from './report'

export const toMinorUnits = (value: number): number => Math.round((value + Number.EPSILON) * 100)
export const fromMinorUnits = (value: number): number => value / 100

export function rowTotalMinor(row: TreatmentRow): number {
  if (!row.enabled || row.included) return 0
  return Math.round(row.quantity * toMinorUnits(row.unitPrice))
}

export function visitTotalMinor(rows: TreatmentRow[]): number {
  return rows.reduce((total, row) => total + rowTotalMinor(row), 0)
}

type VisitDiscount = Pick<AksuReportData['firstVisit'], 'discountEnabled' | 'discountMode' | 'discountedFinalPrice' | 'discountPercentage'>

function visitFinalTotalMinor(rows: TreatmentRow[], discount: VisitDiscount): number {
  const gross = visitTotalMinor(rows)
  if (!discount.discountEnabled) return gross
  if (discount.discountMode === 'manual_final_price') {
    return Math.min(gross, toMinorUnits(discount.discountedFinalPrice ?? 0))
  }
  const percentage = Math.min(100, Math.max(0, discount.discountPercentage ?? 0))
  return Math.round(gross * (1 - percentage / 100))
}

// Discount is an Aksu-only capability (MB Dental's template has no discount concept) — see clinicRegistry capabilities.
export function finalTotalMinor(report: AksuReportData): number {
  return visitFinalTotalMinor(report.firstVisit.treatmentRows, report.firstVisit)
}

export function secondVisitFinalTotalMinor(report: AksuReportData): number {
  return visitFinalTotalMinor(report.secondVisit.treatmentRows, report.secondVisit)
}
