import { useState, type ReactNode } from "react"
import { BellRingIcon, CheckCircle2Icon, ClockIcon, CopyIcon, PhoneOffIcon, UserPlusIcon, type LucideIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { offboardEmployee, updateEmployee } from "../../../lib/operations"
import type { TeamAnalytics } from "../../../lib/teamAnalytics"
import { ConfirmDialog } from "../../ui"
import { useDashboardFormat } from "./format"

const SNOOZE_KEY = "admin_attention_snoozed"
const SNOOZE_MS = 7 * 86_400_000
const PREVIEW = 5

function readSnoozed(): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? "{}")
    if (!parsed || typeof parsed !== "object") return {}
    const now = Date.now()
    return Object.fromEntries(Object.entries(parsed as Record<string, unknown>).filter((entry): entry is [string, number] => typeof entry[1] === "number" && entry[1] > now))
  } catch { return {} }
}

const groupTones = {
  rose: { box: "border-rose-200 dark:border-rose-900", head: "text-rose-800 dark:text-rose-200", icon: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300" },
  sky: { box: "border-sky-200 dark:border-sky-900", head: "text-sky-800 dark:text-sky-200", icon: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300" },
  amber: { box: "border-amber-200 dark:border-amber-900", head: "text-amber-900 dark:text-amber-200", icon: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300" },
  violet: { box: "border-violet-200 dark:border-violet-900", head: "text-violet-800 dark:text-violet-200", icon: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300" },
} as const

interface Item { id: string; text: string; actions: ReactNode }

function Group({ tone, icon: Icon, title, items, headerAction }: { tone: keyof typeof groupTones; icon: LucideIcon; title: string; items: Item[]; headerAction?: ReactNode }) {
  const { t } = useTranslation()
  const format = useDashboardFormat()
  const [expanded, setExpanded] = useState(false)
  if (items.length === 0) return null
  const shown = expanded ? items : items.slice(0, PREVIEW)
  const styles = groupTones[tone]
  return (
    <section className={`flex min-w-0 flex-col rounded-xl border bg-card p-3 shadow-xs ${styles.box}`}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className={`flex items-center gap-2 text-sm font-semibold ${styles.head}`}>
          <span className={`grid size-7 place-items-center rounded-md ${styles.icon}`}><Icon className="size-4" aria-hidden /></span>
          {title}
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{format.number(items.length)}</span>
        </h3>
        {headerAction}
      </header>
      <ul className={`mt-2 divide-y ${expanded ? "max-h-80 overflow-y-auto" : ""}`}>
        {shown.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1.5">
            <span className="min-w-0 flex-1 truncate text-sm" title={item.text}>{item.text}</span>
            <span className="flex shrink-0 flex-wrap gap-1">{item.actions}</span>
          </li>
        ))}
      </ul>
      {items.length > PREVIEW && (
        <Button variant="ghost" size="sm" className="mt-1 self-start max-md:h-10 max-md:px-3" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
          {expanded ? t("admin.dashboard.attention.showLess") : t("admin.dashboard.attention.showAll", { count: format.number(items.length) })}
        </Button>
      )}
    </section>
  )
}

type Pending = { kind: "deactivate" | "reject"; ids: string[]; name: string } | { kind: "deactivateAll"; ids: string[] }

/** Grouped, actionable to-do list for the admin. Every alert can be resolved or snoozed from here. */
export function AttentionPanel({ attention, onChanged, onViewEmployee, onAssignChannels }: {
  attention: TeamAnalytics["attention"]
  onChanged: () => void
  onViewEmployee: (id: string) => void
  onAssignChannels: () => void
}) {
  const { t } = useTranslation()
  const format = useDashboardFormat()
  const [snoozed, setSnoozed] = useState(readSnoozed)
  const [busy, setBusy] = useState<string>()
  const [failed, setFailed] = useState(false)
  const [confirm, setConfirm] = useState<Pending>()

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key)
    setFailed(false)
    try { await action(); onChanged() } catch { setFailed(true) } finally { setBusy(undefined) }
  }
  const snooze = (id: string) => {
    const next = { ...snoozed, [id]: Date.now() + SNOOZE_MS }
    setSnoozed(next)
    try { localStorage.setItem(SNOOZE_KEY, JSON.stringify(next)) } catch { /* storage disabled */ }
  }
  const unsnoozeAll = () => {
    setSnoozed({})
    try { localStorage.removeItem(SNOOZE_KEY) } catch { /* storage disabled */ }
  }

  const disabled = Boolean(busy)
  const idle = attention.idle.filter((employee) => !snoozed[employee.id])
  const snoozedCount = attention.idle.length - idle.length
  const total = idle.length + attention.pending.length + attention.unassignedChannels.length + attention.duplicates.length

  const idleItems: Item[] = idle.map((employee) => ({
    id: employee.id,
    text: employee.daysSinceActivity === null
      ? t("admin.dashboard.attention.idleNever", { name: employee.name })
      : t("admin.dashboard.attention.idle", { name: employee.name, ago: format.daysAgo(employee.daysSinceActivity) }),
    actions: <>
      <Button variant="ghost" size="sm" className="max-md:h-10 max-md:px-3" onClick={() => onViewEmployee(employee.id)}>{t("admin.dashboard.attention.view")}</Button>
      <Button variant="ghost" size="sm" className="max-md:h-10 max-md:px-3" onClick={() => snooze(employee.id)}>{t("admin.dashboard.attention.snooze")}</Button>
      <Button variant="outline" size="sm" className="max-md:h-10 max-md:px-3" disabled={disabled} onClick={() => setConfirm({ kind: "deactivate", ids: [employee.id], name: employee.name })}>{t("admin.dashboard.attention.deactivate")}</Button>
    </>,
  }))
  const pendingItems: Item[] = attention.pending.map((employee) => ({
    id: employee.id,
    text: t("admin.dashboard.attention.pending", { name: employee.full_name }),
    actions: <>
      <Button size="sm" className="max-md:h-10 max-md:px-3" disabled={disabled} aria-busy={busy === employee.id} onClick={() => void run(employee.id, () => updateEmployee(employee.id, { status: "active" }))}>{t("admin.dashboard.attention.approve")}</Button>
      <Button variant="outline" size="sm" className="max-md:h-10 max-md:px-3" disabled={disabled} onClick={() => setConfirm({ kind: "reject", ids: [employee.id], name: employee.full_name })}>{t("admin.dashboard.attention.reject")}</Button>
    </>,
  }))
  const channelItems: Item[] = attention.unassignedChannels.map((channel) => ({
    id: channel.id,
    text: t("admin.dashboard.attention.channel", { label: channel.label || channel.phone_e164 }),
    actions: <Button variant="outline" size="sm" className="max-md:h-10 max-md:px-3" onClick={onAssignChannels}>{t("admin.dashboard.attention.assign")}</Button>,
  }))
  const duplicateItems: Item[] = attention.duplicates.map((employee) => ({
    id: employee.id,
    text: `${employee.name} · ${t("admin.dashboard.attention.duplicateOf", { name: employee.duplicateOf?.name ?? "" })}`,
    actions: <>
      <Button variant="ghost" size="sm" className="max-md:h-10 max-md:px-3" onClick={() => onViewEmployee(employee.id)}>{t("admin.dashboard.attention.view")}</Button>
      <Button variant="outline" size="sm" className="max-md:h-10 max-md:px-3" disabled={disabled} onClick={() => setConfirm({ kind: "deactivate", ids: [employee.id], name: employee.name })}>{t("admin.dashboard.attention.deactivate")}</Button>
    </>,
  }))

  const confirmText = confirm && (confirm.kind === "deactivateAll"
    ? { title: t("admin.dashboard.attention.confirmAllTitle", { count: format.number(confirm.ids.length) }), body: t("admin.dashboard.attention.confirmAllBody") }
    : confirm.kind === "reject"
      ? { title: t("admin.dashboard.attention.confirmRejectTitle"), body: t("admin.dashboard.attention.confirmRejectBody", { name: confirm.name }) }
      : { title: t("admin.dashboard.attention.confirmTitle"), body: t("admin.dashboard.attention.confirmBody", { name: confirm.name }) })

  return (
    <section aria-labelledby="attention-title" className="rounded-xl border border-amber-300 bg-amber-50 p-3 sm:p-4 dark:border-amber-900 dark:bg-amber-950/30">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="attention-title" className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
          {total ? <BellRingIcon className="size-4" aria-hidden /> : <CheckCircle2Icon className="size-4" aria-hidden />}
          {total ? t("admin.dashboard.attention.title", { total: format.number(total) }) : t("admin.dashboard.attention.allClear")}
        </h2>
        {snoozedCount > 0 && (
          <Button variant="ghost" size="sm" className="max-md:h-10 max-md:px-3" onClick={unsnoozeAll}>{t("admin.dashboard.attention.showSnoozed", { count: format.number(snoozedCount) })}</Button>
        )}
      </div>
      {failed && <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{t("admin.dashboard.attention.actionFailed")}</p>}
      {total > 0 && (
        <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-2">
          <Group tone="sky" icon={UserPlusIcon} title={t("admin.dashboard.attention.groupPending")} items={pendingItems} />
          <Group
            tone="violet"
            icon={CopyIcon}
            title={t("admin.dashboard.attention.groupDuplicates")}
            items={duplicateItems}
            headerAction={duplicateItems.length > 1 && (
              <Button variant="outline" size="sm" className="max-md:h-10 max-md:px-3" disabled={disabled} aria-busy={busy === "all"} onClick={() => setConfirm({ kind: "deactivateAll", ids: attention.duplicates.map((employee) => employee.id) })}>
                {t("admin.dashboard.attention.deactivateAll", { count: format.number(duplicateItems.length) })}
              </Button>
            )}
          />
          <Group tone="rose" icon={ClockIcon} title={t("admin.dashboard.attention.groupIdle")} items={idleItems} />
          <Group tone="amber" icon={PhoneOffIcon} title={t("admin.dashboard.attention.groupChannels")} items={channelItems} />
        </div>
      )}
      {confirm && confirmText && (
        <ConfirmDialog
          open
          onOpenChange={(open) => { if (!open) setConfirm(undefined) }}
          title={confirmText.title}
          body={confirmText.body}
          confirmLabel={t("admin.dashboard.attention.confirm")}
          cancelLabel={t("admin.dashboard.attention.cancel")}
          onConfirm={() => {
            const ids = confirm.ids
            void run(confirm.kind === "deactivateAll" ? "all" : ids[0]!, async () => {
              // Sequential: the RPC also closes channel assignments, keep the load on the DB predictable.
              for (const id of ids) await offboardEmployee(id, "former")
            })
          }}
        />
      )}
    </section>
  )
}
