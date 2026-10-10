import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HEATMAP_BLOCK_HOURS, type TeamAnalytics } from '../../../lib/teamAnalytics'
import { tint, useDashboardFormat } from './format'

const HEAT = 'var(--dash-1)'
// Above this share of the max the cell is dark enough that its number needs light text.
const DARK_CELL = 0.85

function intensity(count: number, max: number): number {
  return count === 0 || max === 0 ? 0 : 0.18 + 0.82 * (count / max)
}

export function ActivityHeatmap({ heatmap }: { heatmap: TeamAnalytics['heatmap'] }) {
  const { t } = useTranslation()
  const format = useDashboardFormat()
  const max = Math.max(0, ...heatmap.flat())
  const days = heatmap.map((_, index) => format.weekday(index))
  const blocks = heatmap[0]?.length ?? 0
  const hourLabel = (block: number) => String(block * HEATMAP_BLOCK_HOURS).padStart(2, '0')
  const legend = [...new Set([1, Math.ceil(max / 2), max])].filter((value) => value > 0)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{t('admin.dashboard.heatmap.title')}</CardTitle>
        <CardDescription>{t('admin.dashboard.heatmap.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {max === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t('admin.dashboard.empty')}</p>
        ) : (
          // `relative` keeps the absolutely positioned sr-only labels inside the scroller instead of widening the page.
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[440px] border-separate border-spacing-1 text-xs">
              <thead>
                <tr>
                  <th scope="col">
                    <span className="sr-only">{t('admin.dashboard.heatmap.day')}</span>
                  </th>
                  {Array.from({ length: blocks }, (_, block) => (
                    <th key={block} scope="col" className="font-normal tabular-nums text-muted-foreground">
                      {hourLabel(block)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.map((row, dayIndex) => (
                  <tr key={dayIndex}>
                    <th scope="row" className="pe-2 text-start font-medium text-muted-foreground">
                      {days[dayIndex]}
                    </th>
                    {row.map((count, block) => {
                      const level = intensity(count, max)
                      return (
                        <td
                          key={block}
                          title={t('admin.dashboard.heatmap.cell', {
                            day: days[dayIndex],
                            hour: hourLabel(block),
                            count,
                          })}
                          className={`h-8 rounded-md text-center text-[11px] font-semibold tabular-nums ${level > DARK_CELL ? 'text-white dark:text-slate-950' : 'text-foreground'}`}
                          style={{
                            backgroundColor: count === 0 ? 'var(--muted)' : tint(HEAT, Math.round(level * 100)),
                          }}
                        >
                          {count > 0 ? format.number(count) : <span className="sr-only">0</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
              <span>{t('admin.dashboard.heatmap.less')}</span>
              <span className="size-4 rounded" style={{ backgroundColor: 'var(--muted)' }} aria-hidden />
              {legend.map((value) => (
                <span
                  key={value}
                  className={`grid h-4 min-w-6 place-items-center rounded px-1 text-[10px] font-semibold tabular-nums ${intensity(value, max) > DARK_CELL ? 'text-white dark:text-slate-950' : 'text-foreground'}`}
                  style={{ backgroundColor: tint(HEAT, Math.round(intensity(value, max) * 100)) }}
                >
                  {format.number(value)}
                </span>
              ))}
              <span>{t('admin.dashboard.heatmap.more')}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
