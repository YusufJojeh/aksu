import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from 'recharts'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import type { EmployeePerformance } from '../../../lib/teamAnalytics'
import { employeeColor, useDashboardFormat, usePrefersReducedMotion } from './format'

const TOP_N = 8

export function EmployeeRankingChart({ employees }: { employees: EmployeePerformance[] }) {
  const { t } = useTranslation()
  const format = useDashboardFormat()
  const animate = !usePrefersReducedMotion()
  const data = employees
    .filter((employee) => employee.reports > 0)
    .slice(0, TOP_N)
    .map((employee) => ({
      id: employee.id,
      name: employee.name,
      reports: employee.reports,
      fill: employeeColor(employee.id),
    }))
  const config = {
    reports: { label: t('admin.dashboard.ranking.reports'), color: 'var(--dash-1)' },
  } satisfies ChartConfig

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{t('admin.dashboard.ranking.title')}</CardTitle>
        <CardDescription>{t('admin.dashboard.ranking.description')}</CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {data.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{t('admin.dashboard.empty')}</p>
        ) : (
          // Mirroring for RTL is done via axis props; SVG text must stay LTR or right-axis labels draw over the bars.
          <ChartContainer
            config={config}
            className="aspect-auto w-full"
            style={{ height: Math.max(120, data.length * 36), direction: 'ltr' }}
          >
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 28 }}>
              <XAxis type="number" dataKey="reports" hide reversed={format.rtl} />
              <YAxis
                type="category"
                dataKey="name"
                orientation={format.rtl ? 'right' : 'left'}
                tickLine={false}
                axisLine={false}
                width={112}
                tickFormatter={(value: string) => (value.length > 16 ? `${value.slice(0, 15)}…` : value)}
              />
              <ChartTooltip
                cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
                content={<ChartTooltipContent hideIndicator />}
              />
              <Bar
                dataKey="reports"
                radius={6}
                barSize={20}
                isAnimationActive={animate}
                background={{ fill: 'var(--muted)', radius: 6, opacity: 0.6 }}
              >
                {data.map((row) => (
                  <Cell key={row.id} fill={row.fill} />
                ))}
                {/* A reversed (RTL) axis yields negative-width bars, so "right" already lands past the bar end in both directions. */}
                <LabelList
                  dataKey="reports"
                  position="right"
                  formatter={(value) => format.number(Number(value))}
                  className="fill-foreground text-xs font-semibold tabular-nums"
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
