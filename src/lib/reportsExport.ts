import type { ArchivedReport, ReportReview } from './operations'
import { reviewStateOf, reviewsByReport } from './reportReview'

export const exportHeaders = [
  'Finalized at',
  'Patient',
  'Patient phone',
  'Patient ID',
  'Clinic',
  'Employee',
  'Employee phone',
  'Language',
  'Currency',
  'First visit total',
  'Second visit total',
  'Total',
  'Type',
  'Review',
  'Reviewed at',
  'Review note',
  'Voice note',
] as const

type Cell = string | number | Date | null

/** One spreadsheet row per report, in the order of `exportHeaders`. Money is in major units (minor / 100). */
export function buildExportRows(reports: ArchivedReport[], reviews: ReportReview[]): Cell[][] {
  const byReport = reviewsByReport(reviews)
  return reports.map((report) => {
    const review = byReport.get(report.id)
    return [
      new Date(report.finalized_at),
      report.patient_name,
      report.patient_phone,
      report.patient_identifier ?? '',
      report.clinic_id,
      report.employee_name_snapshot,
      report.employee_phone_snapshot,
      report.document_locale,
      report.currency,
      report.first_visit_total_minor / 100,
      report.second_visit_total_minor / 100,
      (report.first_visit_total_minor + report.second_visit_total_minor) / 100,
      report.parent_report_id ? 'edited copy' : 'original',
      reviewStateOf(review),
      review ? new Date(review.created_at) : null,
      review?.note ?? '',
      review?.voice_note_key ? 'yes' : '',
    ]
  })
}

export async function reportsToXlsx(reports: ArchivedReport[], reviews: ReportReview[]): Promise<Blob> {
  const { default: writeXlsxFile } = await import('write-excel-file/universal')
  const head = exportHeaders.map((value) => ({ value, fontWeight: 'bold' as const }))
  const body = buildExportRows(reports, reviews).map((row) =>
    row.map((value) => {
      if (value instanceof Date) return { value, type: Date, format: 'yyyy-mm-dd hh:mm' }
      if (typeof value === 'number') return { value, type: Number, format: '#,##0.00' }
      return { value: value === null || value === '' ? undefined : value, type: String }
    }),
  )
  const widths = [18, 24, 16, 14, 14, 22, 16, 9, 9, 14, 14, 14, 12, 14, 18, 40, 10]
  return writeXlsxFile([head, ...body] as never, { columns: widths.map((width) => ({ width })) } as never).toBlob()
}
