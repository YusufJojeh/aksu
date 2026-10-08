import { BellRingIcon, ClockIcon, PhoneOffIcon, UserPlusIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TeamAnalytics } from "../../../lib/teamAnalytics"
import { useDashboardFormat } from "./format"

/** Action items for the admin. Renders nothing when everything is fine. */
export function AttentionStrip({ attention }: { attention: TeamAnalytics["attention"] }) {
  const { t } = useTranslation()
  const format = useDashboardFormat()
  const items = [
    ...attention.idle.map((employee) => ({
      key: `idle-${employee.id}`,
      icon: ClockIcon,
      tone: "border-rose-200 bg-white text-rose-900 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-100 [&>svg]:text-rose-600 dark:[&>svg]:text-rose-400",
      text: employee.daysSinceActivity === null
        ? t("admin.dashboard.attention.idleNever", { name: employee.name })
        : t("admin.dashboard.attention.idle", { name: employee.name, ago: format.daysAgo(employee.daysSinceActivity) }),
    })),
    ...attention.pending.map((employee) => ({
      key: `pending-${employee.id}`,
      icon: UserPlusIcon,
      tone: "border-sky-200 bg-white text-sky-900 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-100 [&>svg]:text-sky-600 dark:[&>svg]:text-sky-400",
      text: t("admin.dashboard.attention.pending", { name: employee.full_name }),
    })),
    ...attention.unassignedChannels.map((channel) => ({
      key: `channel-${channel.id}`,
      icon: PhoneOffIcon,
      tone: "border-amber-200 bg-white text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400",
      text: t("admin.dashboard.attention.channel", { label: channel.label || channel.phone_e164 }),
    })),
  ]
  if (items.length === 0) return null

  return (
    <section aria-labelledby="attention-title" className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:border-amber-900 dark:from-amber-950/40 dark:to-orange-950/30">
      <h2 id="attention-title" className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
        <BellRingIcon className="size-4" aria-hidden />
        {t("admin.dashboard.attention.title", { total: format.number(items.length) })}
      </h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {items.map(({ key, icon: Icon, tone, text }) => (
          <li key={key} className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium shadow-xs ${tone}`}>
            <Icon className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
