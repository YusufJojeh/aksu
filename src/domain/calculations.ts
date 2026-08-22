import type { ReportData, TreatmentRow } from './report'

export const toMinorUnits = (value: number): number => Math.round((value + Number.EPSILON) * 100)
export const fromMinorUnits = (value: number): number => value / 100

export function rowTotalMinor(row: TreatmentRow): number {
  if (!row.enabled || row.included) return 0
  return Math.round(row.quantity * toMinorUnits(row.unitPrice))
}

export function visitTotalMinor(rows: TreatmentRow[]): number {
  return rows.reduce((total, row) => total + rowTotalMinor(row), 0)
}

export function finalTotalMinor(report: ReportData): number {
  const gross = visitTotalMinor(report.firstVisit.treatmentRows)
  if (!report.firstVisit.discountEnabled) return gross
  if (report.firstVisit.discountMode === 'manual_final_price') {
    return Math.min(gross, toMinorUnits(report.firstVisit.discountedFinalPrice ?? 0))
  }
  const percentage = Math.min(100, Math.max(0, report.firstVisit.discountPercentage ?? 0))
  return Math.round(gross * (1 - percentage / 100))
}
