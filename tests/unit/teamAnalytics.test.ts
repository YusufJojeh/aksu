import { describe, expect, it } from 'vitest'
import type { EmployeeProfile } from '../../src/auth/types'
import type { ArchivedReport, CommunicationChannel, ReportEvent } from '../../src/lib/operations'
import { buildTeamAnalytics } from '../../src/lib/teamAnalytics'

// Wednesday 2026-10-14 15:00 local time.
const NOW = new Date(2026, 9, 14, 15, 0)
const daysAgo = (days: number, hour = 10) => new Date(2026, 9, 14 - days, hour).toISOString()

const employee = (id: string, overrides: Partial<EmployeeProfile> = {}): EmployeeProfile => ({
  id, full_name: id.toUpperCase(), email: `${id}@clinic.test`, role: 'SALES', status: 'active',
  requested_phone_e164: '+905550000000', created_at: daysAgo(200), updated_at: daysAgo(200), ...overrides,
})

let seq = 0
const report = (owner: string, finalizedDaysAgo: number, overrides: Partial<ArchivedReport> = {}): ArchivedReport => ({
  id: `r${++seq}`, created_by_employee_id: owner, clinic_id: 'aksu', document_locale: 'en', currency: 'EUR',
  patient_name: 'P', patient_phone: '+1', report_payload: {} as ArchivedReport['report_payload'],
  first_visit_total_minor: 100_00, second_visit_total_minor: 50_00, employee_name_snapshot: owner, employee_phone_snapshot: '+1',
  template_version: 'v1', finalized_at: daysAgo(finalizedDaysAgo), pdf_storage_key: 'k', pdf_sha256: 'h', ...overrides,
})

const build = (input: { reports?: ArchivedReport[]; employees?: EmployeeProfile[]; events?: ReportEvent[]; channels?: CommunicationChannel[] }, rangeDays: 7 | 30 | 90 = 7) =>
  buildTeamAnalytics({ reports: [], employees: [], events: [], channels: [], ...input, rangeDays, now: NOW })

describe('buildTeamAnalytics', () => {
  it('splits reports into the current and previous period and computes the change', () => {
    const result = build({
      employees: [employee('a')],
      reports: [report('a', 0), report('a', 3), report('a', 6), report('a', 8), report('a', 30)],
    })
    expect(result.summary.reports).toBe(3)
    expect(result.summary.previousReports).toBe(1)
    expect(result.summary.changePct).toBe(200)
    expect(result.trend).toHaveLength(7)
    expect(result.trend.at(-1)).toMatchObject({ date: '2026-10-14', current: 1 })
    expect(result.trend.reduce((sum, day) => sum + day.previous, 0)).toBe(1)
  })

  it('buckets the 90-day trend into weeks keyed by their first day', () => {
    const result = build({ employees: [employee('a')], reports: [report('a', 0), report('a', 1), report('a', 89), report('a', 95)] }, 90)
    expect(result.trendUnit).toBe('week')
    expect(result.trend).toHaveLength(13)
    expect(result.trend[0]).toMatchObject({ date: '2026-07-17', current: 1 })
    expect(result.trend.at(-1)).toMatchObject({ date: '2026-10-09', current: 2 })
    expect(result.trend.reduce((sum, week) => sum + week.current, 0)).toBe(3)
    expect(result.trend.reduce((sum, week) => sum + week.previous, 0)).toBe(1)
    expect(build({ employees: [employee('a')] }, 30).trendUnit).toBe('day')
  })

  it('derives the headline insights in reading order', () => {
    const result = build({
      employees: [employee('a'), employee('b')],
      reports: [report('a', 0, { finalized_at: new Date(2026, 9, 14, 9, 30).toISOString() }), report('a', 1), report('b', 2), report('a', 8)],
    })
    expect(result.insights).toEqual([
      { kind: 'change', pct: 200 },
      { kind: 'leader', name: 'A', reports: 2 },
      // Every slot holds one report, so the first one scanned (Monday 10:00 → block 5) wins.
      { kind: 'busiest', weekday: 0, block: 5 },
      { kind: 'allActive' },
    ])
    expect(build({ employees: [employee('a')], reports: [report('a', 20)] }).insights).toEqual([{ kind: 'idle', count: 1 }])
  })

  it('counts a report stamped slightly after the client clock (server clock skew)', () => {
    const result = build({ employees: [employee('a')], reports: [report('a', 0, { finalized_at: new Date(NOW.getTime() + 60_000).toISOString() })] })
    expect(result.summary.reports).toBe(1)
    expect(result.employees[0]).toMatchObject({ reports: 1, daysSinceActivity: 0 })
  })

  it('returns null change when there is no previous data', () => {
    expect(build({ employees: [employee('a')], reports: [report('a', 1)] }).summary.changePct).toBeNull()
  })

  it('keeps plan value separated per currency', () => {
    const result = build({
      employees: [employee('a')],
      reports: [report('a', 1), report('a', 2, { currency: 'GBP', first_visit_total_minor: 200_00, second_visit_total_minor: 0 })],
    })
    expect(result.summary.valueByCurrency).toEqual({ EUR: 150_00, GBP: 200_00 })
    expect(result.employees[0]!.valueByCurrency).toEqual({ EUR: 150_00, GBP: 200_00 })
  })

  it('ranks employees, flags the top performer and tiers the rest around the team average', () => {
    const result = build({
      employees: [employee('a'), employee('b'), employee('c'), employee('d')],
      reports: [...[0, 1, 2, 3, 4, 5].map((d) => report('a', d)), report('b', 1), report('b', 2), report('c', 1)],
    })
    // 9 reports / 4 active = 2.25 average.
    expect(result.employees.map((row) => [row.id, row.tier])).toEqual([['a', 'top'], ['b', 'average'], ['c', 'below'], ['d', 'none']])
  })

  it('counts active days, follow-ups and only the employee own downloads in the period', () => {
    const first = report('a', 1)
    const followUp = report('a', 1, { parent_report_id: first.id })
    const result = build({
      employees: [employee('a')],
      reports: [first, followUp, report('a', 2)],
      events: [
        { id: 'e1', report_id: first.id, actor_id: 'a', event_type: 'downloaded', created_at: daysAgo(1) },
        { id: 'e2', report_id: first.id, actor_id: 'admin', event_type: 'admin_downloaded', created_at: daysAgo(1) },
        { id: 'e3', report_id: first.id, actor_id: 'a', event_type: 'downloaded', created_at: daysAgo(20) },
      ],
    })
    const row = result.employees[0]!
    expect(row.activeDays).toBe(2)
    expect(row.followUps).toBe(1)
    expect(row.downloads).toBe(1)
  })

  it('marks quiet active employees idle but gives new hires a grace period', () => {
    const result = build({
      employees: [
        employee('quiet'),
        employee('never', { created_at: daysAgo(40) }),
        employee('fresh', { created_at: daysAgo(2) }),
        employee('busy'),
        employee('gone', { status: 'former' }),
      ],
      reports: [report('quiet', 10), report('busy', 1), report('gone', 20)],
    }, 30)
    const byId = Object.fromEntries(result.employees.map((row) => [row.id, row]))
    expect(byId.quiet).toMatchObject({ idle: true, daysSinceActivity: 10 })
    expect(byId.never).toMatchObject({ idle: true, daysSinceActivity: null })
    expect(byId.fresh).toMatchObject({ idle: false, isNew: true })
    expect(byId.busy!.idle).toBe(false)
    // Former staff stay visible only because they produced a report in the period, and are never idle.
    expect(byId.gone).toMatchObject({ idle: false, reports: 1 })
    expect(result.summary.idleEmployees).toBe(2)
    expect(result.summary.totalEmployees).toBe(4)
  })

  it('lists pending staff and active channels without an assignee as attention items', () => {
    const channel = (id: string, overrides: Partial<CommunicationChannel>): CommunicationChannel => ({
      id, phone_e164: '+905551112233', type: 'whatsapp', label: id, status: 'active', created_at: daysAgo(5), ...overrides,
    })
    const result = build({
      employees: [employee('a'), employee('p', { status: 'pending' })],
      reports: [report('a', 0)],
      channels: [
        channel('free', {}),
        channel('off', { status: 'inactive' }),
        channel('used', { current_assignment: { employee_id: 'a', assigned_at: daysAgo(3) } }),
      ],
    })
    expect(result.attention.pending.map((row) => row.id)).toEqual(['p'])
    expect(result.attention.unassignedChannels.map((row) => row.id)).toEqual(['free'])
    expect(result.employees.find((row) => row.id === 'a')!.phone).toBe('+905551112233')
    expect(result.summary.pendingEmployees).toBe(1)
  })

  it('buckets the heatmap by Monday-first weekday and two-hour block', () => {
    // NOW is a Wednesday; 10:00 falls in block 5.
    const result = build({ employees: [employee('a')], reports: [report('a', 0, { finalized_at: new Date(2026, 9, 14, 10, 30).toISOString() })] })
    expect(result.heatmap[2]![5]).toBe(1)
    expect(result.heatmap.flat().reduce((a, b) => a + b, 0)).toBe(1)
  })

  it('fills an eight-week sparkline with the most recent week last', () => {
    const result = build({ employees: [employee('a')], reports: [report('a', 0), report('a', 0), report('a', 50)] })
    const weekly = result.employees[0]!.weekly
    expect(weekly).toHaveLength(8)
    expect(weekly.at(-1)).toBe(2)
    expect(weekly.reduce((a, b) => a + b, 0)).toBe(3)
  })

  it('groups clinic and language counts for the period only, largest first', () => {
    const result = build({
      employees: [employee('a')],
      reports: [report('a', 1, { clinic_id: 'mb-dental', document_locale: 'ar' }), report('a', 2, { clinic_id: 'mb-dental' }), report('a', 3), report('a', 20, { clinic_id: 'other' })],
    })
    expect(result.byClinic).toEqual([{ key: 'mb-dental', count: 2 }, { key: 'aksu', count: 1 }])
    expect(result.byLocale).toEqual([{ key: 'en', count: 2 }, { key: 'ar', count: 1 }])
  })
})
