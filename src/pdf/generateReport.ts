import type { ClinicId } from '../clinics/types'
import type { Locale, ReportData } from '../domain/report'
import { generateAksuReport } from './generators/aksu'
import { generateMbReport } from './generators/mb'

export interface GeneratedReport { bytes: Uint8Array; clinicId: ClinicId; usedTemplate: Locale; usedFallback: boolean }

export async function generateReport(report: ReportData): Promise<GeneratedReport> {
  if (report.clinicId === 'aksu') return generateAksuReport(report)
  return generateMbReport(report)
}
