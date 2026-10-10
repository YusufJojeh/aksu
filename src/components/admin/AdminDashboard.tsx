import { useLayoutEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppSidebar } from './dashboard/app-sidebar'
import { SiteHeader } from './dashboard/site-header'
import type { AdminView } from './dashboard/types'
import { SidebarInset, SidebarProvider } from '../ui/sidebar'
import { TooltipProvider } from '../ui/tooltip'
import { useAuth } from '../../auth/AuthProvider'
import { locales, type Locale } from '../../domain/report'
import { isRtl } from '../../lib/locale'
import { TeamDashboard } from './TeamDashboard'
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

export function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const auth = useAuth()
  const { t, i18n } = useTranslation()
  const [view, setView] = useState<AdminView>('dashboard')
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = (() => {
      try {
        return localStorage.getItem(ADMIN_LANG_KEY)
      } catch {
        return null
      }
    })()
    return (locales as readonly string[]).includes(saved ?? '') ? (saved as Locale) : 'en'
  })

  // Side effects run after render (before paint), not during it, so React can render purely.
  useLayoutEffect(() => {
    if (i18n.language !== locale) void i18n.changeLanguage(locale)
    document.documentElement.lang = locale
    document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr'
    try {
      localStorage.setItem(ADMIN_LANG_KEY, locale)
    } catch {
      /* private browsing / storage disabled */
    }
  }, [i18n, locale])
  const applyLocale = (next: Locale) => setLocale(next)

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
            onSalesWorkspace={() => {
              window.location.href = '/'
            }}
          />
          <SidebarInset>
            <SiteHeader title={t(VIEW_TITLE_KEYS[view])} locale={locale} onLocaleChange={applyLocale} />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="@container/main flex min-w-0 flex-1 flex-col gap-2">
                {view === 'dashboard' && <TeamDashboard onAssignChannels={() => setView('channels')} />}
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
