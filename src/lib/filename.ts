import { clinicRegistry } from '../clinics/registry'
import type { ClinicId } from '../clinics/types'
import type { Locale } from '../domain/report'
import type { ArchivedReport } from './operations'

// eslint-disable-next-line no-control-regex -- filenames must strip the Windows control-character range
const RESERVED_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1F]/g

export function sanitizeFilenamePart(value: string): string {
  return value.normalize('NFKD').replace(RESERVED_FILENAME_CHARS, '').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 80)
}

export function reportFilename(clinicId: ClinicId, name: string, date: string, locale: Locale): string {
  const safeName = sanitizeFilenamePart(name) || 'Patient'
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10)
  return `${clinicRegistry[clinicId].filenamePrefix}_${safeName}_${safeDate}_${locale.toUpperCase()}.pdf`
}

export function archivedReportFilename(report: ArchivedReport): string {
  return reportFilename(report.clinic_id as ClinicId, report.patient_name,
    report.report_payload?.patient?.reportDate || report.finalized_at.slice(0, 10), report.document_locale as Locale)
}
