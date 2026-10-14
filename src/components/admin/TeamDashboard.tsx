import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GaugeIcon, LayoutGridIcon, RefreshCwIcon, UsersIcon } from 'lucide-react'
import { Tabs } from 'radix-ui'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { EmployeeProfile } from '../../auth/types'
import {
  listChannels,
  listEmployees,
  listReportEvents,
  listReports,
  type ArchivedReport,
  type CommunicationChannel,
  type ReportEvent,
} from '../../lib/operations'
import { buildTeamAnalytics, rangeOptions, type RangeDays } from '../../lib/teamAnalytics'
import { ExportReportsButton } from './ExportReportsButton'
import { ActivityHeatmap } from './dashboard/activity-heatmap'
import { AttentionPanel } from './dashboard/attention-strip'
import { EmployeeDetailSheet } from './dashboard/employee-detail-sheet'
import { EmployeePerformanceTable } from './dashboard/employee-performance-table'
import { EmployeeRankingChart } from './dashboard/employee-ranking-chart'
import { InsightsPanel } from './dashboard/insights-panel'
import { TeamDistribution } from './dashboard/team-distribution'
import { TeamKpiCards } from './dashboard/team-kpi-cards'
import { TeamTrendChart } from './dashboard/team-trend-chart'

const RANGE_KEY = 'admin_dashboard_range'
const TAB_KEY = 'admin_dashboard_tab'
const TABS = [
  { value: 'overview', icon: GaugeIcon },
  { value: 'employees', icon: UsersIcon },
  { value: 'patterns', icon: LayoutGridIcon },
] as const
type DashboardTab = (typeof TABS)[number]['value']

const tabTrigger =
  'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-150 max-md:min-h-10 [@media(hover:hover)]:hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm'

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
  } catch {
    return 30
  }
}

function readSavedTab(): DashboardTab {
  try {
    const saved = localStorage.getItem(TAB_KEY)
    return TABS.some((tab) => tab.value === saved) ? (saved as DashboardTab) : 'overview'
  } catch {
    return 'overview'
  }
}

export function TeamDashboard({ onAssignChannels, readOnly = false }: { onAssignChannels: () => void; readOnly?: boolean }) {
  const { t, i18n } = useTranslation()
  const [range, setRange] = useState<RangeDays>(readSavedRange)
  const [tab, setTab] = useState<DashboardTab>(readSavedTab)
  const [selectedId, setSelectedId] = useState<string>()
  const [data, setData] = useState<DashboardData>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    void Promise.all([listReports(), listEmployees(), listReportEvents(), listChannels()])
      .then(([reports, employees, events, channels]) =>
        setData({ reports, employees, events, channels, loadedAt: new Date() }),
      )
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])
  useEffect(load, [load])

  const analytics = useMemo(
    () => data && buildTeamAnalytics({ ...data, rangeDays: range, now: data.loadedAt }),
    [data, range],
  )
  const selected = analytics?.employees.find((employee) => employee.id === selectedId)
  const selectedProfile = data?.employees.find((employee) => employee.id === selectedId)

  const changeRange = (value: string) => {
    if (!value) return
    const next = Number(value) as RangeDays
    setRange(next)
    try {
      localStorage.setItem(RANGE_KEY, String(next))
    } catch {
      /* storage disabled */
    }
  }
  const changeTab = (value: string) => {
    setTab(value as DashboardTab)
    try {
      localStorage.setItem(TAB_KEY, value)
    } catch {
      /* storage disabled */
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-xl border bg-muted text-foreground"
            aria-hidden
          >
            <UsersIcon className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{t('admin.dashboard.heading')}</h1>
            {data && (
              <p className="text-xs text-muted-foreground">
                {t('admin.dashboard.updated', {
                  time: data.loadedAt.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' }),
                })}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportReportsButton
            reports={(data?.reports ?? []).filter(
              (report) => Date.parse(report.finalized_at) >= (data?.loadedAt.getTime() ?? 0) - range * 86_400_000,
            )}
          />
          <ToggleGroup
            type="single"
            value={String(range)}
            onValueChange={changeRange}
            variant="outline"
            aria-label={t('admin.dashboard.range.label')}
          >
            {rangeOptions.map((days) => (
              <ToggleGroupItem key={days} value={String(days)} className="px-3 max-md:h-10">
                {t(`admin.dashboard.range.d${days}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Button
            variant="outline"
            size="icon"
            className="max-md:size-11"
            onClick={load}
            disabled={loading}
            aria-label={t('admin.dashboard.refresh')}
            title={t('admin.dashboard.refresh')}
          >
            <RefreshCwIcon className={loading ? 'animate-spin motion-reduce:animate-none' : undefined} />
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        >
          {t('admin.dashboard.loadError')}
          <Button variant="outline" size="sm" className="max-md:h-10 max-md:px-3" onClick={load}>
            {t('admin.dashboard.retry')}
          </Button>
        </div>
      )}

      {!analytics && loading && (
        <div className="grid gap-4" aria-busy="true" aria-label={t('admin.dashboard.loading')}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      )}

      {analytics && data && (
        <Tabs.Root value={tab} onValueChange={changeTab} dir={i18n.dir()} className="flex min-w-0 flex-col gap-4">
          <Tabs.List
            aria-label={t('admin.dashboard.heading')}
            className="inline-flex max-w-full self-start overflow-x-auto rounded-lg bg-muted p-1"
          >
            {TABS.map(({ value, icon: Icon }) => (
              <Tabs.Trigger key={value} value={value} className={tabTrigger}>
                <Icon className="size-4" aria-hidden />
                {t(`admin.dashboard.tabs.${value}`)}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="overview" className="flex min-w-0 flex-col gap-4 focus-visible:outline-none">
            <TeamKpiCards summary={analytics.summary} />
            <AttentionPanel
              readOnly={readOnly}
              attention={analytics.attention}
              onChanged={load}
              onViewEmployee={setSelectedId}
              onAssignChannels={onAssignChannels}
            />
            <InsightsPanel insights={analytics.insights} />
            <div className="grid min-w-0 gap-4 xl:grid-cols-3">
              <div className="min-w-0 xl:col-span-2">
                <TeamTrendChart trend={analytics.trend} unit={analytics.trendUnit} />
              </div>
              <div className="min-w-0">
                <EmployeeRankingChart employees={analytics.employees} />
              </div>
            </div>
          </Tabs.Content>

          <Tabs.Content value="employees" className="min-w-0 focus-visible:outline-none">
            <EmployeePerformanceTable employees={analytics.employees} onSelect={setSelectedId} />
          </Tabs.Content>

          <Tabs.Content value="patterns" className="grid min-w-0 gap-4 focus-visible:outline-none xl:grid-cols-3">
            <div className="min-w-0">
              <TeamDistribution byClinic={analytics.byClinic} byLocale={analytics.byLocale} />
            </div>
            <div className="min-w-0 xl:col-span-2">
              <ActivityHeatmap heatmap={analytics.heatmap} />
            </div>
          </Tabs.Content>
        </Tabs.Root>
      )}

      <EmployeeDetailSheet
        employee={selected}
        profile={selectedProfile}
        reports={data?.reports ?? []}
        rangeDays={range}
        onOpenChange={(open) => {
          if (!open) setSelectedId(undefined)
        }}
      />
    </div>
  )
}
