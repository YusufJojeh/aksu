import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChartLineIcon, GaugeIcon, LayoutGridIcon, RefreshCwIcon, UsersIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { EmployeeProfile } from '../../auth/types'
import { listChannels, listEmployees, listReportEvents, listReports, type ArchivedReport, type CommunicationChannel, type ReportEvent } from '../../lib/operations'
import { buildTeamAnalytics, rangeOptions, type RangeDays } from '../../lib/teamAnalytics'
import { ActivityHeatmap } from './dashboard/activity-heatmap'
import { AttentionStrip } from './dashboard/attention-strip'
import { EmployeePerformanceTable } from './dashboard/employee-performance-table'
import { EmployeeRankingChart } from './dashboard/employee-ranking-chart'
import { InsightsPanel } from './dashboard/insights-panel'
import { SectionHeading } from './dashboard/section-heading'
import { TeamDistribution } from './dashboard/team-distribution'
import { TeamKpiCards } from './dashboard/team-kpi-cards'
import { TeamTrendChart } from './dashboard/team-trend-chart'

const RANGE_KEY = 'admin_dashboard_range'

interface DashboardData {
  reports: ArchivedReport[]
  employees: EmployeeProfile[]
  events: ReportEvent[]
  channels: CommunicationChannel[]
  loadedAt: Date
}

function readSavedRange(): RangeDays {
  try {
    const saved = Number(localStorage.getItem(RANGE_KEY))
    return (rangeOptions as readonly number[]).includes(saved) ? (saved as RangeDays) : 30
  } catch { return 30 }
}

export function TeamDashboard() {
  const { t, i18n } = useTranslation()
  const [range, setRange] = useState<RangeDays>(readSavedRange)
  const [data, setData] = useState<DashboardData>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    void Promise.all([listReports(), listEmployees(), listReportEvents(), listChannels()])
      .then(([reports, employees, events, channels]) => setData({ reports, employees, events, channels, loadedAt: new Date() }))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])
  useEffect(load, [load])

  const analytics = useMemo(() => data && buildTeamAnalytics({ ...data, rangeDays: range, now: data.loadedAt }), [data, range])

  const changeRange = (value: string) => {
    if (!value) return
    const next = Number(value) as RangeDays
    setRange(next)
    try { localStorage.setItem(RANGE_KEY, String(next)) } catch { /* storage disabled */ }
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25" aria-hidden>
            <UsersIcon className="size-5" />
          </span>
          <div>
          <h1 className="text-xl font-semibold tracking-tight">{t('admin.dashboard.heading')}</h1>
          {data && (
            <p className="text-xs text-muted-foreground">
              {t('admin.dashboard.updated', { time: data.loadedAt.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' }) })}
            </p>
          )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={String(range)} onValueChange={changeRange} variant="outline" aria-label={t('admin.dashboard.range.label')}>
            {rangeOptions.map((days) => (
              <ToggleGroupItem key={days} value={String(days)} className="px-3">{t(`admin.dashboard.range.d${days}`)}</ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label={t('admin.dashboard.refresh')}>
            <RefreshCwIcon className={loading ? 'animate-spin' : undefined} />
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {t('admin.dashboard.loadError')}
          <Button variant="outline" size="sm" onClick={load}>{t('admin.dashboard.retry')}</Button>
        </div>
      )}

      {!analytics && loading && (
        <div className="grid gap-4" aria-busy="true" aria-label={t('admin.dashboard.loading')}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)}
          </div>
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {analytics && (
        <>
          <SectionHeading icon={GaugeIcon} accent="blue">{t('admin.dashboard.sections.overview')}</SectionHeading>
          <TeamKpiCards summary={analytics.summary} />
          <InsightsPanel insights={analytics.insights} />
          <AttentionStrip attention={analytics.attention} />
          <SectionHeading icon={ChartLineIcon} accent="violet">{t('admin.dashboard.sections.trends')}</SectionHeading>
          <div className="grid min-w-0 gap-4 xl:grid-cols-3">
            <div className="min-w-0 xl:col-span-2"><TeamTrendChart trend={analytics.trend} unit={analytics.trendUnit} /></div>
            <div className="min-w-0"><EmployeeRankingChart employees={analytics.employees} /></div>
          </div>
          <SectionHeading icon={UsersIcon} accent="emerald">{t('admin.dashboard.sections.people')}</SectionHeading>
          <EmployeePerformanceTable employees={analytics.employees} />
          <SectionHeading icon={LayoutGridIcon} accent="amber">{t('admin.dashboard.sections.patterns')}</SectionHeading>
          <div className="grid min-w-0 gap-4 xl:grid-cols-3">
            <div className="min-w-0"><TeamDistribution byClinic={analytics.byClinic} byLocale={analytics.byLocale} /></div>
            <div className="min-w-0 xl:col-span-2"><ActivityHeatmap heatmap={analytics.heatmap} /></div>
          </div>
        </>
      )}
    </div>
  )
}
