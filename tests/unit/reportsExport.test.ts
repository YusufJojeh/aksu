import { describe, expect, it } from 'vitest'
import { buildExportRows, exportHeaders, reportsToXlsx } from '../../src/lib/reportsExport'
import type { ArchivedReport, ReportReview } from '../../src/lib/operations'

const report = (over: Partial<ArchivedReport>) =>
  ({
    id: 'r1',
    clinic_id: 'aksu',
    document_locale: 'en',
    currency: 'EUR',
    patient_name: 'Ali',
    patient_phone: '+905551112233',
    employee_name_snapshot: 'Sara',
    employee_phone_snapshot: '+905001112233',
    first_visit_total_minor: 150050,
    second_visit_total_minor: 50,
    finalized_at: '2026-10-01T10:00:00Z',
    ...over,
  }) as ArchivedReport

describe('reports export', () => {
  it('builds one row per report with totals in major units and the review state', () => {
    const review = { report_id: 'r1', decision: 'rejected', note: 'fix prices', voice_note_key: 'k', created_at: '2026-10-02T10:00:00Z' } as ReportReview
    const rows = buildExportRows([report({}), report({ id: 'r2', parent_report_id: 'r1' })], [review])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveLength(exportHeaders.length)
    expect(rows[0]!.slice(9, 14)).toEqual([1500.5, 0.5, 1501, 'original', 'rejected'])
    expect(rows[0]![15]).toBe('fix prices')
    expect(rows[1]![12]).toBe('edited copy')
    expect(rows[1]![13]).toBe('pending_review')
  })

  it('produces a zip-based xlsx file', async () => {
    const blob = await reportsToXlsx([report({})], [])
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.readAsBinaryString(blob.slice(0, 2))
    })
    expect(text).toBe('PK')
  })
})

describe('team performance export', () => {
  it('builds a workbook from team analytics', async () => {
    const { buildTeamAnalytics } = await import('../../src/lib/teamAnalytics')
    const analytics = buildTeamAnalytics({
      reports: [report({ created_by_employee_id: 'e1', finalized_at: new Date().toISOString() })],
      employees: [{ id: 'e1', full_name: 'Sara', role: 'SALES', status: 'active', requested_phone_e164: '+905001112233', created_at: '2026-01-01T00:00:00Z' }] as never,
      events: [],
      channels: [],
      rangeDays: 30,
    })
    const { teamPerformanceToXlsx } = await import('../../src/lib/reportsExport')
    const blob = await teamPerformanceToXlsx(analytics)
    expect(blob.size).toBeGreaterThan(1000)
  })
})
