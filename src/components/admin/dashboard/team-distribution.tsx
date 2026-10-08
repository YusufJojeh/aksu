import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TeamAnalytics } from "../../../lib/teamAnalytics"
import { paletteColor, useDashboardFormat } from "./format"

function ShareList({ title, items, label, offset }: { title: string; items: { key: string; count: number }[]; label: (key: string) => string; offset: number }) {
  const { t } = useTranslation()
  const format = useDashboardFormat()
  const total = items.reduce((sum, item) => sum + item.count, 0)
  const rows = items.map((item, index) => ({ ...item, pct: (item.count / total) * 100, color: paletteColor(index + offset) }))
  return (
    <div>
      <h3 className="text-sm font-medium">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{t("admin.dashboard.empty")}</p>
      ) : (
        <>
          {/* One stacked bar for the whole split; the list below carries the exact numbers, so colour is never the only cue. */}
          <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden>
            {rows.map((row) => <div key={row.key} className="h-full first:rounded-s-full last:rounded-e-full" style={{ width: `${row.pct}%`, backgroundColor: row.color }} />)}
          </div>
          <ul className="mt-3 space-y-1.5">
            {rows.map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} aria-hidden />
                  <span className="truncate">{label(row.key)}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  <span className="font-medium text-foreground">{format.number(row.count)}</span> · {format.percent(Math.round(row.pct))}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export function TeamDistribution({ byClinic, byLocale }: Pick<TeamAnalytics, "byClinic" | "byLocale">) {
  const { t, i18n } = useTranslation()
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{t("admin.dashboard.distribution.title")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <ShareList title={t("admin.dashboard.distribution.clinic")} items={byClinic} offset={0} label={(key) => t(`admin.clinic.${key}`, { defaultValue: key })} />
        {/* Offset the palette so the two splits don't read as the same categories. */}
        <ShareList
          title={t("admin.dashboard.distribution.language")}
          items={byLocale}
          offset={3}
          label={(key) => (i18n.exists(`languages.${key}`) ? t(`languages.${key}`) : key.toUpperCase())}
        />
      </CardContent>
    </Card>
  )
}
