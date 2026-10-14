import type { ArchivedReport, ReportReview } from './operations'
import type { TeamAnalytics } from './teamAnalytics'
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

type SheetCell = { value?: string | number | Date; type?: unknown; format?: string; fontWeight?: 'bold' }

const textCell = (value: string | null | undefined): SheetCell => ({ value: value || undefined, type: String })
const numberCell = (value: number | null, format = '#,##0'): SheetCell =>
  value === null ? { type: String } : { value, type: Number, format }
const headerRow = (labels: string[]): SheetCell[] => labels.map((value) => ({ value, fontWeight: 'bold' as const }))
const moneyText = (byCurrency: Record<string, number>) =>
  Object.entries(byCurrency)
    .map(([currency, minor]) => `${(minor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency}`)
    .join(' + ')

/** Team performance workbook: a Summary sheet for the period and one row per employee. */
export async function teamPerformanceToXlsx(analytics: TeamAnalytics, generatedAt = new Date()): Promise<Blob> {
  const { default: writeXlsxFile } = await import('write-excel-file/universal')
  const { summary } = analytics
  const summaryRows: SheetCell[][] = [
    headerRow(['Metric', 'Value']),
    [textCell('Period (days)'), numberCell(analytics.rangeDays)],
    [textCell('Generated at'), { value: generatedAt, type: Date, format: 'yyyy-mm-dd hh:mm' }],
    [textCell('Active employees'), numberCell(summary.activeEmployees)],
    [textCell('Total employees'), numberCell(summary.totalEmployees)],
    [textCell('Pending approval'), numberCell(summary.pendingEmployees)],
    [textCell('Finalized reports'), numberCell(summary.reports)],
    [textCell('Reports in previous period'), numberCell(summary.previousReports)],
    [textCell('Change vs previous (%)'), numberCell(summary.changePct, '0.0')],
    [textCell('Average reports per active employee'), numberCell(summary.avgPerActive, '0.0')],
    [textCell('Inactive employees'), numberCell(summary.idleEmployees)],
    [textCell('Treatment plan value'), textCell(moneyText(summary.valueByCurrency))],
  ]
  const employeeRows: SheetCell[][] = [
    headerRow([
      'Employee', 'Status', 'Performance', 'Reports', 'Previous period', 'Change (%)', 'Plan value', 'Active days',
      'Follow-ups', 'Downloads', 'Last report', 'Days since last report', 'Phone',
    ]),
    ...analytics.employees.map((employee): SheetCell[] => [
      textCell(employee.name),
      textCell(employee.status),
      textCell(employee.idle ? 'inactive' : employee.isNew ? 'new' : employee.tier),
      numberCell(employee.reports),
      numberCell(employee.previousReports),
      numberCell(employee.changePct, '0.0'),
      textCell(moneyText(employee.valueByCurrency)),
      numberCell(employee.activeDays),
      numberCell(employee.followUps),
      numberCell(employee.downloads),
      employee.lastActivityAt
        ? { value: new Date(employee.lastActivityAt), type: Date, format: 'yyyy-mm-dd hh:mm' }
        : { type: String },
      numberCell(employee.daysSinceActivity),
      textCell(employee.phone || employee.requestedPhone),
    ]),
  ]
  const sheets = [
    { data: summaryRows, sheet: 'Summary', columns: [{ width: 38 }, { width: 28 }] },
    {
      data: employeeRows,
      sheet: 'Employees',
      columns: [26, 11, 13, 9, 15, 11, 26, 12, 11, 11, 18, 20, 18].map((width) => ({ width })),
    },
  ]
  return writeXlsxFile(sheets as never).toBlob()
}
