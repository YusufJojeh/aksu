import type { ArchivedReport, ReportEvent } from './operations'

export type ReportKindFilter = 'all' | 'original' | 'edited'

export interface HistoryLogEntry {
  id: string
  report: ArchivedReport
  type: 'created' | 'edited' | 'downloaded'
  at: string
}

export interface ReportHistory {
  /** Every saved version in the same edit chain, oldest first. */
  versions: ArchivedReport[]
  /** Newest first: when each version was created or edited and every download. */
  log: HistoryLogEntry[]
}

export function isEditedCopy(report: ArchivedReport): boolean {
  return Boolean(report.parent_report_id)
}

export function filterReports(
  reports: ArchivedReport[],
  filter: { kind: ReportKindFilter; query: string },
): ArchivedReport[] {
  const query = filter.query.trim().toLowerCase()
  return reports.filter(
    (report) =>
      (filter.kind === 'all' || (filter.kind === 'edited') === isEditedCopy(report)) &&
      (!query || `${report.patient_name} ${report.patient_phone}`.toLowerCase().includes(query)),
  )
}

export function downloadCounts(events: ReportEvent[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const event of events) {
    if (event.event_type === 'downloaded' || event.event_type === 'admin_downloaded')
      counts.set(event.report_id, (counts.get(event.report_id) ?? 0) + 1)
  }
  return counts
}

/** Finds the original of an edit chain and collects it with every copy edited from it, directly or not. */
export function buildReportHistory(reports: ArchivedReport[], events: ReportEvent[], reportId: string): ReportHistory {
  const byId = new Map(reports.map((report) => [report.id, report]))
  const start = byId.get(reportId)
  if (!start) return { versions: [], log: [] }

  let root = start
  const seen = new Set<string>([root.id])
  while (root.parent_report_id) {
    const parent = byId.get(root.parent_report_id)
    if (!parent || seen.has(parent.id)) break
    root = parent
    seen.add(root.id)
  }

  const children = new Map<string, ArchivedReport[]>()
  for (const report of reports) {
    if (!report.parent_report_id) continue
    children.set(report.parent_report_id, [...(children.get(report.parent_report_id) ?? []), report])
  }
  const versions: ArchivedReport[] = []
  const queue = [root]
  const visited = new Set<string>()
  while (queue.length) {
    const next = queue.shift()!
    if (visited.has(next.id)) continue
    visited.add(next.id)
    versions.push(next)
    queue.push(...(children.get(next.id) ?? []))
  }
  versions.sort((a, b) => a.finalized_at.localeCompare(b.finalized_at))

  const log: HistoryLogEntry[] = []
  const ids = new Set(versions.map((version) => version.id))
  for (const version of versions) {
    // Copies record both 'finalized' and 'duplicated'; show one "edited" line for them.
    if (!isEditedCopy(version))
      log.push({ id: `created-${version.id}`, report: version, type: 'created', at: version.finalized_at })
    else log.push({ id: `edited-${version.id}`, report: version, type: 'edited', at: version.finalized_at })
  }
  for (const event of events) {
    if (!ids.has(event.report_id)) continue
    if (event.event_type !== 'downloaded' && event.event_type !== 'admin_downloaded') continue
    log.push({ id: event.id, report: byId.get(event.report_id)!, type: 'downloaded', at: event.created_at })
  }
  log.sort((a, b) => b.at.localeCompare(a.at))
  return { versions, log }
}
