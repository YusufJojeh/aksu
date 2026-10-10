import type { ReactNode } from "react"
import { AlertTriangleIcon, CheckCircle2Icon, FileCheck2Icon, UsersIcon, WalletIcon, type LucideIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { IDLE_AFTER_DAYS, type TeamAnalytics } from "../../../lib/teamAnalytics"
import { ChangeIndicator } from "./change-indicator"
import { currencyEntries, useDashboardFormat } from "./format"

// Literal class strings so Tailwind keeps them; one hue per metric, reused nowhere else on the card row.
const tones = {
  violet: { card: "border-t-violet-500", tile: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300" },
  blue: { card: "border-t-blue-500", tile: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" },
  emerald: { card: "border-t-emerald-500", tile: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" },
  rose: { card: "border-t-rose-500", tile: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300" },
  teal: { card: "border-t-teal-500", tile: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300" },
} as const

function KpiCard({ tone, icon: Icon, label, value, footer }: { tone: keyof typeof tones; icon: LucideIcon; label: string; value: ReactNode; footer: ReactNode }) {
  return (
    <Card className={`border-t-4 bg-card shadow-xs ${tones[tone].card}`}>
      <CardHeader>
        <CardDescription className="flex items-center gap-2.5 font-medium text-foreground/80">
          <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${tones[tone].tile}`}><Icon className="size-[18px]" aria-hidden /></span>
          {label}
        </CardDescription>
        <CardTitle className="text-3xl font-semibold tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardFooter className="mt-auto text-sm text-muted-foreground">{footer}</CardFooter>
    </Card>
  )
}

export function TeamKpiCards({ summary }: { summary: TeamAnalytics["summary"] }) {
  const { t } = useTranslation()
  const format = useDashboardFormat()
  const values = currencyEntries(summary.valueByCurrency)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        tone="violet"
        icon={UsersIcon}
        label={t("admin.dashboard.kpi.team")}
        value={<>{format.number(summary.activeEmployees)}<span className="text-base font-normal text-muted-foreground"> / {format.number(summary.totalEmployees)}</span></>}
        footer={summary.pendingEmployees ? t("admin.dashboard.kpi.teamPending", { pending: format.number(summary.pendingEmployees) }) : t("admin.dashboard.kpi.teamHint")}
      />
      <KpiCard
        tone="blue"
        icon={FileCheck2Icon}
        label={t("admin.dashboard.kpi.reports")}
        value={<span className="flex flex-wrap items-baseline gap-2">{format.number(summary.reports)}<ChangeIndicator pct={summary.changePct} /></span>}
        footer={t("admin.dashboard.kpi.reportsHint", { avg: format.number(summary.avgPerActive), previous: format.number(summary.previousReports) })}
      />
      <KpiCard
        tone="emerald"
        icon={WalletIcon}
        label={t("admin.dashboard.kpi.value")}
        value={values.length ? format.money(values[0]![1], values[0]![0]) : "—"}
        footer={values.length > 1
          ? <span className="flex flex-col gap-0.5">{values.slice(1).map(([currency, minor]) => <span key={currency} className="tabular-nums">+ {format.money(minor, currency)}</span>)}</span>
          : t("admin.dashboard.kpi.valueHint")}
      />
      <KpiCard
        tone={summary.idleEmployees ? "rose" : "teal"}
        icon={summary.idleEmployees ? AlertTriangleIcon : CheckCircle2Icon}
        label={t("admin.dashboard.kpi.idle")}
        value={<span className={summary.idleEmployees ? "text-rose-700 dark:text-rose-400" : "text-teal-700 dark:text-teal-400"}>{format.number(summary.idleEmployees)}</span>}
        footer={t("admin.dashboard.kpi.idleHint", { days: format.number(IDLE_AFTER_DAYS) })}
      />
    </div>
  )
}
