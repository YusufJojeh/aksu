import { Area, AreaChart, CartesianGrid, Line, XAxis, YAxis } from 'recharts'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { TeamAnalytics } from '../../../lib/teamAnalytics'
import { useDashboardFormat, usePrefersReducedMotion } from './format'

export function TeamTrendChart({ trend, unit }: { trend: TeamAnalytics['trend']; unit: TeamAnalytics['trendUnit'] }) {
  const { t } = useTranslation()
  const format = useDashboardFormat()
  const animate = !usePrefersReducedMotion()
  const config = {
    current: { label: t('admin.dashboard.trend.current'), color: 'var(--dash-1)' },
    previous: { label: t('admin.dashboard.trend.previous'), color: 'var(--dash-previous)' },
  } satisfies ChartConfig

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{t('admin.dashboard.trend.title')}</CardTitle>
        <CardDescription>
          {t(unit === 'week' ? 'admin.dashboard.trend.descriptionWeekly' : 'admin.dashboard.trend.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {/* RTL mirroring is done via axis props; SVG text must stay LTR so right-axis ticks anchor correctly. */}
        <ChartContainer config={config} className="aspect-auto h-[260px] w-full" style={{ direction: 'ltr' }}>
          <AreaChart data={trend} margin={{ left: 0, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="fillTeamCurrent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-current)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--color-current)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              reversed={format.rtl}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={28}
              tickFormatter={format.shortDate}
            />
            <YAxis
              allowDecimals={false}
              orientation={format.rtl ? 'right' : 'left'}
              tickLine={false}
              axisLine={false}
              width={28}
              tickFormatter={(value: number) => format.number(value)}
            />
            <ChartTooltip
              cursor={{ stroke: 'var(--color-current)', strokeOpacity: 0.3 }}
              content={
                <ChartTooltipContent labelFormatter={(value) => format.shortDate(String(value))} indicator="dot" />
              }
            />
            <Line
              dataKey="previous"
              type="monotone"
              stroke="var(--color-previous)"
              strokeDasharray="5 4"
              strokeWidth={2}
              dot={false}
              isAnimationActive={animate}
            />
            <Area
              dataKey="current"
              type="monotone"
              fill="url(#fillTeamCurrent)"
              stroke="var(--color-current)"
              strokeWidth={2.5}
              activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--card)' }}
              dot={unit === 'week' ? { r: 3, fill: 'var(--color-current)', strokeWidth: 0 } : false}
              isAnimationActive={animate}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
