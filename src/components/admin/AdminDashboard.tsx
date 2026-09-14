import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppSidebar } from './dashboard/app-sidebar'
import { SectionCards } from './dashboard/section-cards'
import { ChartAreaInteractive } from './dashboard/chart-area-interactive'
import { SiteHeader } from './dashboard/site-header'
import type { AdminView } from './dashboard/types'
import { SidebarInset, SidebarProvider } from '../ui/sidebar'
import { TooltipProvider } from '../ui/tooltip'
import { listReports, type ArchivedReport } from '../../lib/operations'
import { useAuth } from '../../auth/AuthProvider'
import { locales, type Locale } from '../../domain/report'
import { isRtl } from '../../lib/locale'
import { AdminAnalytics } from './AdminAnalytics'
import { ChannelsAdmin } from './ChannelsAdmin'
import { CustomersAdmin } from './CustomersAdmin'
import { EmployeesAdmin } from './EmployeesAdmin'
import { ReportsAdmin } from './ReportsAdmin'
import { ProfileSettings } from '../ProfileSettings'

const ADMIN_LANG_KEY = 'admin_dashboard_locale'

const VIEW_TITLE_KEYS: Record<AdminView, string> = {
  dashboard: 'admin.nav.dashboard',
  employees: 'admin.nav.employees',
  channels: 'admin.nav.channels',
  reports: 'admin.nav.reports',
  customers: 'admin.nav.customers',
  profile: 'admin.nav.profile',
}

function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function buildDailySeries(reports: ArchivedReport[], days: number): { date: string; finalized: number }[] {
  const counts = new Map<string, number>()
  for (const report of reports) counts.set(toDayKey(new Date(report.finalized_at)), (counts.get(toDayKey(new Date(report.finalized_at))) ?? 0) + 1)
  const series: { date: string; finalized: number }[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
    const key = toDayKey(day)
    series.push({ date: key, finalized: counts.get(key) ?? 0 })
  }
  return series
}

export function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const auth = useAuth()
  const { t, i18n } = useTranslation()
  const [view, setView] = useState<AdminView>('dashboard')
  const [reports, setReports] = useState<ArchivedReport[]>([])
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = (() => { try { return localStorage.getItem(ADMIN_LANG_KEY) } catch { return null } })()
    return (locales as readonly string[]).includes(saved ?? '') ? (saved as Locale) : 'en'
  })

  useEffect(() => { void listReports().then(setReports).catch(() => setReports([])) }, [])

  const applyLocale = (next: Locale) => {
    setLocale(next)
    void i18n.changeLanguage(next)
    document.documentElement.lang = next
    document.documentElement.dir = isRtl(next) ? 'rtl' : 'ltr'
    try { localStorage.setItem(ADMIN_LANG_KEY, next) } catch { /* private browsing / storage disabled */ }
  }
  if (i18n.language !== locale) applyLocale(locale)

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const week = new Date(today); week.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const month = new Date(now.getFullYear(), now.getMonth(), 1)
  const counts = useMemo(() => ({
    total: reports.length,
    today: reports.filter((r) => new Date(r.finalized_at) >= today).length,
    week: reports.filter((r) => new Date(r.finalized_at) >= week).length,
    month: reports.filter((r) => new Date(r.finalized_at) >= month).length,
  }), [reports]) // eslint-disable-line react-hooks/exhaustive-deps
  const dailySeries = useMemo(() => buildDailySeries(reports, 90), [reports])

  const user = { name: auth.profile?.full_name ?? 'Admin', email: auth.profile?.email ?? '' }

  return (
    <div className="shadcn-dash min-h-screen">
      <TooltipProvider delayDuration={0}>
        <SidebarProvider style={{ '--sidebar-width': '18rem', '--header-height': '3rem' } as React.CSSProperties}>
          <AppSidebar
            view={view}
            onViewChange={setView}
            user={user}
            onLogout={onLogout}
            onProfile={() => setView('profile')}
            onSalesWorkspace={() => { window.location.href = '/' }}
          />
          <SidebarInset>
            <SiteHeader title={t(VIEW_TITLE_KEYS[view])} locale={locale} onLocaleChange={applyLocale} />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="@container/main flex min-w-0 flex-1 flex-col gap-2">
                {view === 'dashboard' && (
                  <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                    <SectionCards total={counts.total} today={counts.today} week={counts.week} month={counts.month} />
                    <div className="px-4 lg:px-6">
                      <ChartAreaInteractive data={dailySeries} />
                    </div>
                    <div className="px-4 lg:px-6">
                      <AdminAnalytics />
                    </div>
                  </div>
                )}
                {view === 'employees' && <EmployeesAdmin />}
                {view === 'channels' && <ChannelsAdmin />}
                {view === 'reports' && <ReportsAdmin />}
                {view === 'customers' && <CustomersAdmin />}
                {view === 'profile' && <ProfileSettings />}
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </div>
  )
}
