import { TrophyIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SPARKLINE_WEEKS, type EmployeePerformance } from '../../../lib/teamAnalytics'
import { ChangeIndicator } from './change-indicator'
import { currencyEntries, employeeColor, tint, useDashboardFormat } from './format'

function Sparkline({ values, label, color }: { values: number[]; label: string; color: string }) {
  const width = 84
  const height = 26
  const max = Math.max(1, ...values)
  const step = width / Math.max(1, values.length - 1)
  const coords = values.map((value, index) => [index * step, height - 3 - (value / max) * (height - 6)] as const)
  const points = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const last = coords.at(-1)
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className="overflow-visible rtl:-scale-x-100"
      style={{ color }}
    >
      <polygon points={`0,${height} ${points} ${width},${height}`} fill="currentColor" opacity={0.12} />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {last && <circle cx={last[0]} cy={last[1]} r={2.5} fill="currentColor" />}
    </svg>
  )
}

const flagStyles = {
  idle: 'border-transparent bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300',
  new: 'border-transparent bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300',
  top: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  above: 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
  below: 'border-transparent bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300',
  duplicate: 'border-transparent bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300',
} as const

function FlagBadge({ employee }: { employee: EmployeePerformance }) {
  const { t } = useTranslation()
  const flag = employee.duplicateOf
    ? 'duplicate'
    : employee.idle
      ? 'idle'
      : employee.isNew
        ? 'new'
        : employee.tier === 'top' || employee.tier === 'above' || employee.tier === 'below'
          ? employee.tier
          : null
  if (!flag) return null
  return (
    <Badge variant="outline" className={flagStyles[flag]}>
      {flag === 'top' && <TrophyIcon className="size-3" aria-hidden />}
      {t(`admin.dashboard.flag.${flag}`)}
    </Badge>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts.at(-1)![0]! : '')).toUpperCase() || '?'
}

function Avatar({ employee }: { employee: EmployeePerformance }) {
  const color = employeeColor(employee.id)
  return (
    <span
      aria-hidden
      className="grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold"
      style={{ color, backgroundColor: tint(color, 16), boxShadow: `inset 0 0 0 1.5px ${tint(color, 45)}` }}
    >
      {initials(employee.name)}
    </span>
  )
}

function useRowParts(employee: EmployeePerformance, maxReports: number, onSelect: (id: string) => void) {
  const { t } = useTranslation()
  const format = useDashboardFormat()
  const values = currencyEntries(employee.valueByCurrency)
  const color = employeeColor(employee.id)
  return {
    name: (
      <div className="flex min-w-0 items-center gap-3">
        <Avatar employee={employee} />
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSelect(employee.id)}
            aria-label={t('admin.dashboard.employee.open', { name: employee.name })}
            className="truncate rounded-sm text-start font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {employee.name}
          </button>
          <FlagBadge employee={employee} />
          {employee.status !== 'active' && <Badge variant="outline">{t(`admin.status.${employee.status}`)}</Badge>}
        </div>
      </div>
    ),
    reports: (
      <div className="min-w-24">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-semibold tabular-nums">{format.number(employee.reports)}</span>
          <ChangeIndicator pct={employee.changePct} />
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className="h-full rounded-full"
            style={{ width: `${maxReports ? (employee.reports / maxReports) * 100 : 0}%`, backgroundColor: color }}
          />
        </div>
      </div>
    ),
    value: values.length ? (
      <div className="flex flex-col tabular-nums">
        {values.map(([currency, minor]) => (
          <span key={currency}>{format.money(minor, currency)}</span>
        ))}
      </div>
    ) : (
      <span className="text-muted-foreground">—</span>
    ),
    lastActivity:
      employee.daysSinceActivity === null ? (
        <span className="text-muted-foreground">{t('admin.dashboard.table.never')}</span>
      ) : (
        <span className={employee.idle ? 'font-medium text-rose-700 dark:text-rose-400' : undefined}>
          {format.daysAgo(employee.daysSinceActivity)}
        </span>
      ),
    sparkline: (
      <Sparkline
        color={color}
        values={employee.weekly}
        label={t('admin.dashboard.table.sparklineAria', { values: employee.weekly.join(', ') })}
      />
    ),
  }
}

function EmployeeRow({
  employee,
  maxReports,
  onSelect,
}: {
  employee: EmployeePerformance
  maxReports: number
  onSelect: (id: string) => void
}) {
  const parts = useRowParts(employee, maxReports, onSelect)
  const format = useDashboardFormat()
  return (
    <TableRow
      className={
        employee.idle ? 'bg-rose-50/60 hover:bg-rose-50 dark:bg-rose-950/20 dark:hover:bg-rose-950/30' : undefined
      }
    >
      <TableCell className="max-w-[280px] ps-4">{parts.name}</TableCell>
      <TableCell>{parts.reports}</TableCell>
      <TableCell>{parts.value}</TableCell>
      <TableCell className="tabular-nums">{format.number(employee.activeDays)}</TableCell>
      <TableCell className="tabular-nums">{format.number(employee.followUps)}</TableCell>
      <TableCell className="tabular-nums">{format.number(employee.downloads)}</TableCell>
      <TableCell>{parts.lastActivity}</TableCell>
      <TableCell className="pe-4">{parts.sparkline}</TableCell>
    </TableRow>
  )
}

function EmployeeCard({
  employee,
  maxReports,
  onSelect,
}: {
  employee: EmployeePerformance
  maxReports: number
  onSelect: (id: string) => void
}) {
  const { t } = useTranslation()
  const parts = useRowParts(employee, maxReports, onSelect)
  const format = useDashboardFormat()
  return (
    <li
      className={`rounded-lg border border-s-4 p-3 ${employee.idle ? 'bg-rose-50/60 dark:bg-rose-950/20' : ''}`}
      style={{ borderInlineStartColor: employeeColor(employee.id) }}
    >
      <div className="flex items-start justify-between gap-3">
        {parts.name}
        {parts.sparkline}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">{t('admin.dashboard.table.colReports')}</dt>
          <dd>{parts.reports}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t('admin.dashboard.table.colValue')}</dt>
          <dd>{parts.value}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t('admin.dashboard.table.colActiveDays')}</dt>
          <dd className="tabular-nums">{format.number(employee.activeDays)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t('admin.dashboard.table.colLastActivity')}</dt>
          <dd>{parts.lastActivity}</dd>
        </div>
      </dl>
    </li>
  )
}

export function EmployeePerformanceTable({
  employees,
  onSelect,
}: {
  employees: EmployeePerformance[]
  onSelect: (id: string) => void
}) {
  const { t } = useTranslation()
  const maxReports = Math.max(0, ...employees.map((employee) => employee.reports))
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.dashboard.table.title')}</CardTitle>
        <CardDescription>{t('admin.dashboard.table.description')}</CardDescription>
      </CardHeader>
      <CardContent className="px-0 sm:px-0">
        {employees.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">{t('admin.dashboard.empty')}</p>
        ) : (
          <>
            <div className="hidden md:block">
              <Table className="min-w-[860px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="ps-4 text-start">{t('admin.dashboard.table.colEmployee')}</TableHead>
                    <TableHead className="text-start">{t('admin.dashboard.table.colReports')}</TableHead>
                    <TableHead className="text-start">{t('admin.dashboard.table.colValue')}</TableHead>
                    <TableHead className="text-start">{t('admin.dashboard.table.colActiveDays')}</TableHead>
                    <TableHead className="text-start">{t('admin.dashboard.table.colFollowUps')}</TableHead>
                    <TableHead className="text-start">{t('admin.dashboard.table.colDownloads')}</TableHead>
                    <TableHead className="text-start">{t('admin.dashboard.table.colLastActivity')}</TableHead>
                    <TableHead className="pe-4 text-start">
                      {t('admin.dashboard.table.colTrend', { weeks: SPARKLINE_WEEKS })}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <EmployeeRow key={employee.id} employee={employee} maxReports={maxReports} onSelect={onSelect} />
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="grid gap-3 px-4 md:hidden">
              {employees.map((employee) => (
                <EmployeeCard key={employee.id} employee={employee} maxReports={maxReports} onSelect={onSelect} />
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
