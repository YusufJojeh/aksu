import { describe, expect, it } from 'vitest'
import type { ArchivedReport, ReportEvent } from '../../src/lib/operations'
import { buildReportHistory, downloadCounts, filterReports } from '../../src/lib/reportHistory'

const report = (id: string, finalized: string, parent?: string, name = 'Ayla Demir'): ArchivedReport => ({
  id, parent_report_id: parent, patient_name: name, patient_phone: '+905551112233', finalized_at: finalized,
} as ArchivedReport)
const event = (id: string, report_id: string, event_type: ReportEvent['event_type'], created_at: string): ReportEvent =>
  ({ id, report_id, actor_id: 'u', event_type, created_at })

const a = report('a', '2026-10-01T10:00:00Z')
const b = report('b', '2026-10-02T10:00:00Z', 'a')
const c = report('c', '2026-10-03T10:00:00Z', 'b')
const other = report('x', '2026-10-04T10:00:00Z', undefined, 'Someone Else')
const all = [other, c, b, a]

describe('report history', () => {
  it('filters originals, edited copies and search text', () => {
    expect(filterReports(all, { kind: 'original', query: '' }).map((r) => r.id)).toEqual(['x', 'a'])
    expect(filterReports(all, { kind: 'edited', query: '' }).map((r) => r.id)).toEqual(['c', 'b'])
    expect(filterReports(all, { kind: 'all', query: 'someone' }).map((r) => r.id)).toEqual(['x'])
  })

  it('collects the whole edit chain from any version, oldest first', () => {
    for (const id of ['a', 'b', 'c']) expect(buildReportHistory(all, [], id).versions.map((r) => r.id)).toEqual(['a', 'b', 'c'])
    expect(buildReportHistory(all, [], 'x').versions.map((r) => r.id)).toEqual(['x'])
  })

  it('logs creations, edits and downloads newest first, without duplicate finalize lines', () => {
    const events = [
      event('1', 'a', 'finalized', '2026-10-01T10:00:00Z'),
      event('2', 'b', 'finalized', '2026-10-02T10:00:00Z'), event('3', 'b', 'duplicated', '2026-10-02T10:00:00Z'),
      event('4', 'a', 'downloaded', '2026-10-05T10:00:00Z'),
      event('5', 'x', 'downloaded', '2026-10-06T10:00:00Z'),
    ]
    const log = buildReportHistory(all, events, 'b').log
    expect(log.map((entry) => `${entry.type}:${entry.report.id}`)).toEqual(['downloaded:a', 'edited:c', 'edited:b', 'created:a'])
    expect(downloadCounts(events).get('a')).toBe(1)
  })

  it('survives a missing parent and a parent cycle', () => {
    const orphan = report('o', '2026-10-01T00:00:00Z', 'gone')
    expect(buildReportHistory([orphan], [], 'o').versions.map((r) => r.id)).toEqual(['o'])
    const x = report('p', '2026-10-01T00:00:00Z', 'q'); const y = report('q', '2026-10-02T00:00:00Z', 'p')
    expect(buildReportHistory([x, y], [], 'p').versions).toHaveLength(2)
  })
})
