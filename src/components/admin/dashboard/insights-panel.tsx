import {
  CalendarClockIcon,
  PartyPopperIcon,
  SparklesIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  TrophyIcon,
  UserXIcon,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { HEATMAP_BLOCK_HOURS, type TeamInsight } from '../../../lib/teamAnalytics'
import { useDashboardFormat } from './format'

const tiles = {
  up: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  down: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
} as const

/** The 3-minute read: each finding is a full sentence with an icon, never colour alone. */
export function InsightsPanel({ insights }: { insights: TeamInsight[] }) {
  const { t } = useTranslation()
  const format = useDashboardFormat()
  if (insights.length === 0) return null

  const describe = (insight: TeamInsight): { icon: LucideIcon; tile: string; text: string } => {
    switch (insight.kind) {
      case 'change':
        if (insight.pct === 0)
          return { icon: TrendingUpIcon, tile: tiles.blue, text: t('admin.dashboard.insights.flat') }
        return insight.pct > 0
          ? {
              icon: TrendingUpIcon,
              tile: tiles.up,
              text: t('admin.dashboard.insights.up', { pct: format.percent(insight.pct) }),
            }
          : {
              icon: TrendingDownIcon,
              tile: tiles.down,
              text: t('admin.dashboard.insights.down', { pct: format.percent(Math.abs(insight.pct)) }),
            }
      case 'leader':
        return {
          icon: TrophyIcon,
          tile: tiles.amber,
          text: t('admin.dashboard.insights.leader', { name: insight.name, count: format.number(insight.reports) }),
        }
      case 'busiest':
        return {
          icon: CalendarClockIcon,
          tile: tiles.blue,
          text: t('admin.dashboard.insights.busiest', {
            day: format.weekday(insight.weekday, 'long'),
            hour: format.hour(insight.block * HEATMAP_BLOCK_HOURS),
          }),
        }
      case 'idle':
        return {
          icon: UserXIcon,
          tile: tiles.down,
          text: t('admin.dashboard.insights.idle', { count: format.number(insight.count) }),
        }
      case 'allActive':
        return { icon: PartyPopperIcon, tile: tiles.teal, text: t('admin.dashboard.insights.allActive') }
    }
  }

  return (
    <section aria-labelledby="insights-title" className="rounded-xl bg-card p-4 ring-1 ring-border">
      <h2 id="insights-title" className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <SparklesIcon className="size-4" aria-hidden />
        {t('admin.dashboard.insights.title')}
      </h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {insights.map((insight) => {
          const { icon: Icon, tile, text } = describe(insight)
          return (
            <li
              key={insight.kind}
              className="flex items-center gap-3 rounded-lg bg-white/80 p-2.5 text-sm shadow-xs ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10"
            >
              <span className={`grid size-8 shrink-0 place-items-center rounded-md ${tile}`}>
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 font-medium leading-snug">{text}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
