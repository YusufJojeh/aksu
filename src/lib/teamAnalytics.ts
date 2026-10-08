import type { EmployeeProfile, EmployeeStatus } from '../auth/types'
import type { ArchivedReport, CommunicationChannel, ReportEvent } from './operations'

export type RangeDays = 7 | 30 | 90
export const rangeOptions: readonly RangeDays[] = [7, 30, 90]

const DAY_MS = 86_400_000
export const IDLE_AFTER_DAYS = 7
export const NEW_EMPLOYEE_DAYS = 30
export const SPARKLINE_WEEKS = 8
export const HEATMAP_BLOCK_HOURS = 2
// Within ±20% of the team average counts as "average"; beyond that is above/below.
const TIER_BAND = 0.2

export type PerformanceTier = 'top' | 'above' | 'average' | 'below' | 'none'

export interface EmployeePerformance {
  id: string
  name: string
  status: EmployeeStatus
  isNew: boolean
  idle: boolean
  tier: PerformanceTier
  reports: number
  previousReports: number
  changePct: number | null
  valueByCurrency: Record<string, number>
  activeDays: number
  followUps: number
  downloads: number
  lastActivityAt: string | null
  daysSinceActivity: number | null
  weekly: number[]
  phone?: string
  requestedPhone: string
  /** Set when another profile with the same phone is the primary identity for that person. */
  duplicateOf: { id: string; name: string } | null
}

/** Plain-language findings the admin should read first; rendered as sentences by the UI. */
export type TeamInsight =
  | { kind: 'change'; pct: number }
  | { kind: 'leader'; name: string; reports: number }
  | { kind: 'busiest'; weekday: number; block: number }
  | { kind: 'idle'; count: number }
  | { kind: 'allActive' }

export interface TeamAnalytics {
  rangeDays: RangeDays
  /** Trend points are days for short ranges and 7-day buckets (keyed by their first day) for 90 days. */
  trendUnit: 'day' | 'week'
  insights: TeamInsight[]
  summary: {
    activeEmployees: number
    totalEmployees: number
    pendingEmployees: number
    reports: number
    previousReports: number
    changePct: number | null
    avgPerActive: number
    idleEmployees: number
    duplicateProfiles: number
    valueByCurrency: Record<string, number>
  }
  trend: { date: string; current: number; previous: number }[]
  employees: EmployeePerformance[]
  byClinic: { key: string; count: number }[]
  byLocale: { key: string; count: number }[]
  /** heatmap[weekday][block], weekday 0 = Monday, block = hour / HEATMAP_BLOCK_HOURS. */
  heatmap: number[][]
  attention: {
    /** Idle real people; duplicate profiles are listed separately so they don't drown the list. */
    idle: EmployeePerformance[]
    duplicates: EmployeePerformance[]
    pending: EmployeeProfile[]
    unassignedChannels: CommunicationChannel[]
  }
}

export function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function changePct(current: number, previous: number): number | null {
  return previous === 0 ? null : Math.round(((current - previous) / previous) * 100)
}

function addValue(target: Record<string, number>, report: ArchivedReport) {
  target[report.currency] = (target[report.currency] ?? 0) + report.first_visit_total_minor + report.second_visit_total_minor
}

function countBy(reports: ArchivedReport[], key: 'clinic_id' | 'document_locale') {
  const counts = new Map<string, number>()
  for (const report of reports) counts.set(report[key], (counts.get(report[key]) ?? 0) + 1)
  return [...counts].map(([k, count]) => ({ key: k, count })).sort((a, b) => b.count - a.count)
}

export function buildTeamAnalytics(input: {
  reports: ArchivedReport[]
  employees: EmployeeProfile[]
  events: ReportEvent[]
  channels: CommunicationChannel[]
  rangeDays: RangeDays
  now?: Date
}): TeamAnalytics {
  const { reports, employees, events, channels, rangeDays } = input
  const now = input.now ?? new Date()
  const today = startOfDay(now)
  const periodStart = addDays(today, -(rangeDays - 1))
  const previousStart = addDays(periodStart, -rangeDays)
  const time = (value: string) => new Date(value).getTime()

  // No upper bound: a server clock slightly ahead of the browser must not hide a just-finalized report.
  const inPeriod = (value: string) => time(value) >= periodStart.getTime()
  const inPrevious = (value: string) => time(value) >= previousStart.getTime() && time(value) < periodStart.getTime()

  const current = reports.filter((report) => inPeriod(report.finalized_at))
  const previous = reports.filter((report) => inPrevious(report.finalized_at))

  // Team trend: one point per day, aligned with the same weekday offset in the previous period.
  const currentByDay = new Map<string, number>()
  const previousByDay = new Map<string, number>()
  for (const report of current) { const key = toDayKey(new Date(report.finalized_at)); currentByDay.set(key, (currentByDay.get(key) ?? 0) + 1) }
  for (const report of previous) { const key = toDayKey(new Date(report.finalized_at)); previousByDay.set(key, (previousByDay.get(key) ?? 0) + 1) }
  const daily = Array.from({ length: rangeDays }, (_, index) => {
    const day = addDays(periodStart, index)
    return { date: toDayKey(day), current: currentByDay.get(toDayKey(day)) ?? 0, previous: previousByDay.get(toDayKey(addDays(day, -rangeDays))) ?? 0 }
  })
  // 90 daily points are too noisy to read at a glance; sum them into weeks.
  const trendUnit: TeamAnalytics['trendUnit'] = rangeDays === 90 ? 'week' : 'day'
  const trend = trendUnit === 'day' ? daily : daily.reduce<typeof daily>((weeks, point, index) => {
    if (index % 7 === 0) weeks.push({ ...point })
    else { const week = weeks[weeks.length - 1]!; week.current += point.current; week.previous += point.previous }
    return weeks
  }, [])

  const reportOwner = new Map(reports.map((report) => [report.id, report.created_by_employee_id]))
  const downloadsByEmployee = new Map<string, number>()
  for (const event of events) {
    // Only the employee's own downloads; admin downloads are not employee activity.
    if (event.event_type !== 'downloaded' || !inPeriod(event.created_at)) continue
    const owner = reportOwner.get(event.report_id)
    if (owner) downloadsByEmployee.set(owner, (downloadsByEmployee.get(owner) ?? 0) + 1)
  }

  const lastReportAt = new Map<string, string>()
  for (const report of reports) {
    const last = lastReportAt.get(report.created_by_employee_id)
    if (!last || time(report.finalized_at) > time(last)) lastReportAt.set(report.created_by_employee_id, report.finalized_at)
  }

  const phoneByEmployee = new Map<string, string>()
  for (const channel of channels) if (channel.current_assignment) phoneByEmployee.set(channel.current_assignment.employee_id, channel.phone_e164)

  // One phone = one person. Among working profiles sharing a phone, the one with the most reports
  // (then the oldest) is the real identity; the others are duplicates from name typos.
  const allTimeReports = new Map<string, number>()
  for (const report of reports) allTimeReports.set(report.created_by_employee_id, (allTimeReports.get(report.created_by_employee_id) ?? 0) + 1)
  const primaryByPhone = new Map<string, EmployeeProfile>()
  for (const employee of employees) {
    const phone = employee.requested_phone_e164?.trim()
    if (!phone || (employee.status !== 'active' && employee.status !== 'suspended')) continue
    const current = primaryByPhone.get(phone)
    const score = (profile: EmployeeProfile) => allTimeReports.get(profile.id) ?? 0
    if (!current || score(employee) > score(current) || (score(employee) === score(current) && time(employee.created_at) < time(current.created_at))) primaryByPhone.set(phone, employee)
  }
  const duplicateOf = (employee: EmployeeProfile) => {
    const primary = primaryByPhone.get(employee.requested_phone_e164?.trim() ?? '')
    return primary && primary.id !== employee.id && (employee.status === 'active' || employee.status === 'suspended') ? { id: primary.id, name: primary.full_name } : null
  }

  const sparkStart = addDays(today, -(SPARKLINE_WEEKS * 7 - 1))
  const activeEmployees = employees.filter((employee) => employee.status === 'active')
  const avgPerActive = activeEmployees.length ? current.length / activeEmployees.length : 0

  const rows = employees.map((employee): EmployeePerformance => {
    const own = current.filter((report) => report.created_by_employee_id === employee.id)
    const ownPrevious = previous.filter((report) => report.created_by_employee_id === employee.id).length
    const valueByCurrency: Record<string, number> = {}
    for (const report of own) addValue(valueByCurrency, report)
    const weekly = new Array<number>(SPARKLINE_WEEKS).fill(0)
    for (const report of reports) {
      if (report.created_by_employee_id !== employee.id) continue
      const offset = Math.floor((startOfDay(new Date(report.finalized_at)).getTime() - sparkStart.getTime()) / DAY_MS)
      if (offset >= 0 && offset < SPARKLINE_WEEKS * 7) weekly[Math.floor(offset / 7)]! += 1
    }
    const lastActivityAt = lastReportAt.get(employee.id) ?? null
    const daysSinceActivity = lastActivityAt ? Math.max(0, Math.floor((today.getTime() - startOfDay(new Date(lastActivityAt)).getTime()) / DAY_MS)) : null
    const daysSinceJoined = Math.floor((today.getTime() - startOfDay(new Date(employee.created_at)).getTime()) / DAY_MS)
    const isNew = daysSinceJoined < NEW_EMPLOYEE_DAYS
    // A brand-new account is not idle until it has had IDLE_AFTER_DAYS to produce its first report.
    const quietDays = daysSinceActivity ?? daysSinceJoined
    const idle = employee.status === 'active' && quietDays >= IDLE_AFTER_DAYS
    let tier: PerformanceTier = 'none'
    if (own.length > 0) tier = own.length > avgPerActive * (1 + TIER_BAND) ? 'above' : own.length < avgPerActive * (1 - TIER_BAND) ? 'below' : 'average'
    return {
      id: employee.id,
      name: employee.full_name,
      status: employee.status,
      isNew,
      idle,
      tier,
      reports: own.length,
      previousReports: ownPrevious,
      changePct: changePct(own.length, ownPrevious),
      valueByCurrency,
      activeDays: new Set(own.map((report) => toDayKey(new Date(report.finalized_at)))).size,
      followUps: own.filter((report) => report.parent_report_id).length,
      downloads: downloadsByEmployee.get(employee.id) ?? 0,
      lastActivityAt,
      daysSinceActivity,
      weekly,
      phone: phoneByEmployee.get(employee.id),
      requestedPhone: employee.requested_phone_e164,
      duplicateOf: duplicateOf(employee),
    }
  })
    // Former / pending staff only matter here if they produced something in the period.
    .filter((row) => row.status === 'active' || row.status === 'suspended' || row.reports > 0)
    .sort((a, b) => b.reports - a.reports || a.name.localeCompare(b.name))

  if (rows[0] && rows[0].reports > 0) rows[0].tier = 'top'

  const valueByCurrency: Record<string, number> = {}
  for (const report of current) addValue(valueByCurrency, report)

  const heatmap = Array.from({ length: 7 }, () => new Array<number>(24 / HEATMAP_BLOCK_HOURS).fill(0))
  for (const report of current) {
    const date = new Date(report.finalized_at)
    heatmap[(date.getDay() + 6) % 7]![Math.floor(date.getHours() / HEATMAP_BLOCK_HOURS)]! += 1
  }

  const duplicateRows = rows.filter((row) => row.duplicateOf)
  // Longest-quiet first: those are the ones to follow up (or offboard) before anyone else.
  const idleRows = rows.filter((row) => row.idle && !row.duplicateOf)
    .sort((a, b) => (b.daysSinceActivity ?? Infinity) - (a.daysSinceActivity ?? Infinity))
  const pending = employees.filter((employee) => employee.status === 'pending')

  const insights: TeamInsight[] = []
  const teamChange = changePct(current.length, previous.length)
  if (teamChange !== null) insights.push({ kind: 'change', pct: teamChange })
  if (rows[0] && rows[0].reports > 0) insights.push({ kind: 'leader', name: rows[0].name, reports: rows[0].reports })
  let busiest = { weekday: 0, block: 0, count: 0 }
  heatmap.forEach((row, weekday) => row.forEach((count, block) => { if (count > busiest.count) busiest = { weekday, block, count } }))
  if (busiest.count > 0) insights.push({ kind: 'busiest', weekday: busiest.weekday, block: busiest.block })
  if (activeEmployees.length > 0) insights.push(idleRows.length ? { kind: 'idle', count: idleRows.length } : { kind: 'allActive' })

  return {
    rangeDays,
    trendUnit,
    insights,
    summary: {
      activeEmployees: activeEmployees.length,
      totalEmployees: employees.filter((employee) => employee.status !== 'former').length,
      pendingEmployees: pending.length,
      reports: current.length,
      previousReports: previous.length,
      changePct: changePct(current.length, previous.length),
      avgPerActive,
      idleEmployees: idleRows.length,
      duplicateProfiles: duplicateRows.length,
      valueByCurrency,
    },
    trend,
    employees: rows,
    byClinic: countBy(current, 'clinic_id'),
    byLocale: countBy(current, 'document_locale'),
    heatmap,
    attention: {
      idle: idleRows,
      duplicates: duplicateRows,
      pending,
      unassignedChannels: channels.filter((channel) => channel.status === 'active' && !channel.current_assignment),
    },
  }
}

export interface EmployeeCustomer {
  key: string
  name: string
  phone: string
  reports: number
  lastAt: string
}

export interface EmployeeDetail {
  /** Every report by this employee, newest first; `parent_report_id` marks an edited copy. */
  reports: ArchivedReport[]
  customers: EmployeeCustomer[]
  editedCount: number
  trend: { date: string; count: number }[]
}

/** Drill-down for one employee. Customers are the distinct patients across all of their reports. */
export function buildEmployeeDetail(input: { reports: ArchivedReport[]; employeeId: string; rangeDays: RangeDays; now?: Date }): EmployeeDetail {
  const today = startOfDay(input.now ?? new Date())
  const own = input.reports
    .filter((report) => report.created_by_employee_id === input.employeeId)
    .sort((a, b) => new Date(b.finalized_at).getTime() - new Date(a.finalized_at).getTime())

  const customers = new Map<string, EmployeeCustomer>()
  for (const report of own) {
    const digits = report.patient_phone.replace(/\D/g, '')
    const key = digits.length >= 6 ? digits : report.patient_name.trim().toLocaleLowerCase()
    const existing = customers.get(key)
    // Reports are newest first, so the first one seen carries the current name and the last visit.
    if (existing) existing.reports += 1
    else customers.set(key, { key, name: report.patient_name.trim(), phone: report.patient_phone, reports: 1, lastAt: report.finalized_at })
  }

  const periodStart = addDays(today, -(input.rangeDays - 1))
  const byDay = new Map<string, number>()
  for (const report of own) {
    if (new Date(report.finalized_at).getTime() < periodStart.getTime()) continue
    const key = toDayKey(new Date(report.finalized_at))
    byDay.set(key, (byDay.get(key) ?? 0) + 1)
  }
  const trend = Array.from({ length: input.rangeDays }, (_, index) => {
    const date = toDayKey(addDays(periodStart, index))
    return { date, count: byDay.get(date) ?? 0 }
  })

  return {
    reports: own,
    customers: [...customers.values()].sort((a, b) => b.reports - a.reports || b.lastAt.localeCompare(a.lastAt)),
    editedCount: own.filter((report) => report.parent_report_id).length,
    trend,
  }
}
