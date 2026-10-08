import { useMemo, useState } from "react"
import { CalendarCheckIcon, CopyIcon, DownloadIcon, FileCheck2Icon, MousePointerClickIcon, UsersIcon, WalletIcon, type LucideIcon } from "lucide-react"
import { Tabs } from "radix-ui"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { EmployeeProfile } from "../../../auth/types"
import { archivedReportFilename } from "../../../lib/filename"
import { downloadArchivedReport, type ArchivedReport } from "../../../lib/operations"
import { buildEmployeeDetail, type EmployeePerformance, type RangeDays } from "../../../lib/teamAnalytics"
import { currencyEntries, employeeColor, tint, useDashboardFormat } from "./format"

type ReportFilter = "all" | "original" | "edited"

const tabClass = "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"

function Kpi({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: React.ReactNode; color: string }) {
  return (
    <div className="rounded-lg border p-3" style={{ backgroundColor: tint(color, 6) }}>
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Icon className="size-3.5" style={{ color }} aria-hidden />{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

export function EmployeeDetailSheet({ employee, profile, reports, rangeDays, onOpenChange }: {
  employee: EmployeePerformance | undefined
  profile: EmployeeProfile | undefined
  reports: ArchivedReport[]
  rangeDays: RangeDays
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const format = useDashboardFormat()
  const [filter, setFilter] = useState<ReportFilter>("all")
  const [downloading, setDownloading] = useState<string>()
  const [downloadFailed, setDownloadFailed] = useState(false)
  const detail = useMemo(() => employee && buildEmployeeDetail({ reports, employeeId: employee.id, rangeDays }), [employee, reports, rangeDays])
  const byId = useMemo(() => new Map(reports.map((report) => [report.id, report])), [reports])

  const save = async (report: ArchivedReport) => {
    setDownloading(report.id)
    setDownloadFailed(false)
    try {
      const url = URL.createObjectURL(await downloadArchivedReport(report))
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = archivedReportFilename(report)
      document.body.appendChild(anchor); anchor.click(); anchor.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch { setDownloadFailed(true) } finally { setDownloading(undefined) }
  }

  const color = employee ? employeeColor(employee.id) : "var(--dash-1)"
  const values = employee ? currencyEntries(employee.valueByCurrency) : []
  const visibleReports = detail?.reports.filter((report) => filter === "all" || (filter === "edited") === Boolean(report.parent_report_id)) ?? []
  const maxDay = Math.max(1, ...(detail?.trend.map((point) => point.count) ?? []))
  const dateTime = (value: string) => new Date(value).toLocaleString(format.tag, { dateStyle: "medium", timeStyle: "short" })

  return (
    <Sheet open={Boolean(employee)} onOpenChange={onOpenChange}>
      <SheetContent
        side={format.rtl ? "left" : "right"}
        dir={format.rtl ? "rtl" : "ltr"}
        className="gap-0 overflow-y-auto data-[side=left]:w-full data-[side=right]:w-full data-[side=left]:sm:max-w-2xl data-[side=right]:sm:max-w-2xl"
      >
        {employee && detail && (
          <>
            <SheetHeader className="border-b pe-12 rtl:pe-4 rtl:ps-12" style={{ backgroundImage: `linear-gradient(to bottom, ${tint(color, 12)}, transparent)` }}>
              <div className="flex items-center gap-3">
                <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full text-base font-bold" style={{ color, backgroundColor: tint(color, 18), boxShadow: `inset 0 0 0 2px ${tint(color, 50)}` }}>
                  {employee.name.trim().slice(0, 1).toUpperCase() || "?"}
                </span>
                <div className="min-w-0">
                  <SheetTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                    <span className="truncate">{employee.name}</span>
                    <Badge variant="outline">{t(`admin.status.${employee.status}`)}</Badge>
                    {employee.duplicateOf && <Badge variant="outline" className="border-transparent bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300">{t("admin.dashboard.flag.duplicate")}</Badge>}
                  </SheetTitle>
                  <SheetDescription>{profile ? t("admin.dashboard.employee.joined", { date: new Date(profile.created_at).toLocaleDateString(format.tag, { dateStyle: "medium" }) }) : null}</SheetDescription>
                </div>
              </div>
              <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <div className="flex gap-2"><dt className="text-muted-foreground">{t("admin.dashboard.employee.phone")}:</dt><dd dir="ltr" className="tabular-nums">{employee.requestedPhone || "—"}</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground">{t("admin.dashboard.employee.channel")}:</dt><dd dir="ltr" className="tabular-nums">{employee.phone ?? t("admin.dashboard.employee.noChannel")}</dd></div>
                {profile?.email && !profile.email.endsWith("@pdfbuilder.local") && (
                  <div className="flex gap-2 sm:col-span-2"><dt className="text-muted-foreground">{t("admin.dashboard.employee.email")}:</dt><dd className="truncate">{profile.email}</dd></div>
                )}
              </dl>
            </SheetHeader>

            <div className="flex flex-col gap-4 p-4">
              <section aria-label={t("admin.dashboard.employee.period")}>
                <p className="mb-2 text-xs font-medium text-muted-foreground">{t("admin.dashboard.employee.period")} · {t(`admin.dashboard.range.d${rangeDays}`)}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Kpi icon={FileCheck2Icon} color="var(--dash-1)" label={t("admin.dashboard.employee.kpiReports")} value={format.number(employee.reports)} />
                  <Kpi icon={WalletIcon} color="var(--dash-3)" label={t("admin.dashboard.employee.kpiValue")} value={values.length ? <span className="flex flex-col text-base">{values.map(([currency, minor]) => <span key={currency}>{format.money(minor, currency)}</span>)}</span> : "—"} />
                  <Kpi icon={CalendarCheckIcon} color="var(--dash-2)" label={t("admin.dashboard.employee.kpiActiveDays")} value={format.number(employee.activeDays)} />
                  <Kpi icon={CopyIcon} color="var(--dash-5)" label={t("admin.dashboard.employee.kpiEdits")} value={format.number(employee.followUps)} />
                  <Kpi icon={MousePointerClickIcon} color="var(--dash-4)" label={t("admin.dashboard.employee.kpiDownloads")} value={format.number(employee.downloads)} />
                  <Kpi icon={UsersIcon} color="var(--dash-6)" label={t("admin.dashboard.employee.kpiCustomers")} value={format.number(detail.customers.length)} />
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold">{t("admin.dashboard.employee.trendTitle")}</h3>
                <div
                  role="img"
                  aria-label={detail.trend.map((point) => `${format.shortDate(point.date)}: ${format.number(point.count)}`).join(", ")}
                  className="flex h-20 items-end gap-px rounded-lg border p-2"
                >
                  {detail.trend.map((point) => (
                    <span
                      key={point.date}
                      title={`${format.shortDate(point.date)}: ${format.number(point.count)}`}
                      className="min-w-0 flex-1 rounded-t-sm"
                      style={{ height: `${Math.max(4, (point.count / maxDay) * 100)}%`, backgroundColor: point.count ? color : tint(color, 18) }}
                    />
                  ))}
                </div>
              </section>

              <Tabs.Root defaultValue="reports" dir={format.rtl ? "rtl" : "ltr"}>
                <Tabs.List className="inline-flex rounded-lg bg-muted p-1">
                  <Tabs.Trigger value="reports" className={tabClass}>{t("admin.dashboard.employee.reportsTab", { count: format.number(detail.reports.length) })}</Tabs.Trigger>
                  <Tabs.Trigger value="customers" className={tabClass}>{t("admin.dashboard.employee.customersTab", { count: format.number(detail.customers.length) })}</Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value="reports" className="mt-3 focus-visible:outline-none">
                  <ToggleGroup type="single" size="sm" variant="outline" value={filter} onValueChange={(value) => value && setFilter(value as ReportFilter)} aria-label={t("admin.reports.typeFilterLabel")}>
                    <ToggleGroupItem value="all" className="px-3">{t("admin.dashboard.employee.filterAll")}</ToggleGroupItem>
                    <ToggleGroupItem value="original" className="px-3">{t("admin.dashboard.employee.filterOriginal")}</ToggleGroupItem>
                    <ToggleGroupItem value="edited" className="px-3">{t("admin.dashboard.employee.filterEdited")} ({format.number(detail.editedCount)})</ToggleGroupItem>
                  </ToggleGroup>
                  {downloadFailed && <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{t("admin.dashboard.employee.downloadFailed")}</p>}
                  {visibleReports.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">{t("admin.dashboard.employee.noReports")}</p>
                  ) : (
                    <ul className="mt-3 divide-y rounded-lg border">
                      {visibleReports.map((report) => {
                        const parent = report.parent_report_id ? byId.get(report.parent_report_id) : undefined
                        return (
                          <li key={report.id} className="flex items-center gap-3 px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                                <span className="truncate">{report.patient_name}</span>
                                {report.parent_report_id && (
                                  <Badge variant="outline" className="border-transparent bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300">{t("admin.dashboard.employee.edited")}</Badge>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {dateTime(report.finalized_at)} · {t(`admin.clinic.${report.clinic_id}`)} · <span className="uppercase">{report.document_locale}</span> · <span className="tabular-nums">{format.money(report.first_visit_total_minor + report.second_visit_total_minor, report.currency)}</span>
                              </p>
                              {parent && <p className="text-xs text-violet-700 dark:text-violet-300">{t("admin.dashboard.employee.editedFrom", { date: dateTime(parent.finalized_at) })}</p>}
                            </div>
                            <Button variant="outline" size="icon" disabled={Boolean(downloading)} aria-busy={downloading === report.id} aria-label={`${t("admin.dashboard.employee.download")} — ${report.patient_name}`} onClick={() => void save(report)}>
                              <DownloadIcon />
                            </Button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </Tabs.Content>

                <Tabs.Content value="customers" className="mt-3 focus-visible:outline-none">
                  {detail.customers.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">{t("admin.dashboard.employee.noCustomers")}</p>
                  ) : (
                    <ul className="divide-y rounded-lg border">
                      {detail.customers.map((customer) => (
                        <li key={customer.key} className="flex items-center justify-between gap-3 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{customer.name}</p>
                            <p dir="ltr" className="text-xs text-muted-foreground tabular-nums rtl:text-right">{customer.phone || "—"}</p>
                          </div>
                          <div className="shrink-0 text-end text-xs text-muted-foreground">
                            <p><span className="text-sm font-semibold text-foreground tabular-nums">{format.number(customer.reports)}</span> {t("admin.dashboard.employee.customerReports")}</p>
                            <p>{t("admin.dashboard.employee.lastVisit")}: {new Date(customer.lastAt).toLocaleDateString(format.tag, { dateStyle: "medium" })}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Tabs.Content>
              </Tabs.Root>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
