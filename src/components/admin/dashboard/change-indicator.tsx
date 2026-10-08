import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react"
import { cn } from "cn"
import { useTranslation } from "react-i18next"
import { useDashboardFormat } from "./format"

/** Signed change vs the previous period, coded by icon + text as well as color. */
export function ChangeIndicator({ pct, className }: { pct: number | null; className?: string }) {
  const { t } = useTranslation()
  const format = useDashboardFormat()
  if (pct === null) return <span className={cn("text-xs text-muted-foreground", className)}>{t("admin.dashboard.change.noPrevious")}</span>
  const Icon = pct > 0 ? ArrowUpRightIcon : pct < 0 ? ArrowDownRightIcon : MinusIcon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
        pct > 0 ? "text-emerald-700 dark:text-emerald-400" : pct < 0 ? "text-red-700 dark:text-red-400" : "text-muted-foreground",
        className,
      )}
      aria-label={t("admin.dashboard.change.aria", { value: `${pct > 0 ? "+" : ""}${format.number(pct)}%` })}
    >
      <Icon className="size-3.5 rtl:-scale-x-100" aria-hidden />
      {pct > 0 ? "+" : ""}{format.number(pct)}%
    </span>
  )
}
