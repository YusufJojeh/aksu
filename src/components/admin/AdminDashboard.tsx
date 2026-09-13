import { BarChart3, Files, Languages, LogOut, Phone, Users, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { locales, type Locale } from '../../domain/report'
import { isRtl } from '../../lib/locale'
import { Button, Select } from '../ui'
import { AdminAnalytics } from './AdminAnalytics'
import { ChannelsAdmin } from './ChannelsAdmin'
import { CustomersAdmin } from './CustomersAdmin'
import { EmployeesAdmin } from './EmployeesAdmin'
import { ReportsAdmin } from './ReportsAdmin'

type View = 'dashboard' | 'employees' | 'channels' | 'reports' | 'customers'

const ADMIN_LANG_KEY = 'admin_dashboard_locale'

export function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const { t, i18n } = useTranslation()
  const [view, setView] = useState<View>('dashboard')
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = (() => { try { return localStorage.getItem(ADMIN_LANG_KEY) } catch { return null } })()
    return (locales as readonly string[]).includes(saved ?? '') ? (saved as Locale) : 'en'
  })
  const applyLocale = (next: Locale) => {
    setLocale(next)
    void i18n.changeLanguage(next)
    document.documentElement.lang = next
    document.documentElement.dir = isRtl(next) ? 'rtl' : 'ltr'
    try { localStorage.setItem(ADMIN_LANG_KEY, next) } catch { /* private browsing / storage disabled */ }
  }
  if (i18n.language !== locale) applyLocale(locale)
  const navButton = (key: View, label: string, Icon: typeof BarChart3) => (
    <Button variant={view === key ? 'primary' : 'outline'} onClick={() => setView(key)}><Icon size={16} /><span className="sr-only sm:not-sr-only">{label}</span></Button>
  )
  return <div className="min-h-screen bg-parchment text-ink">
    <header className="border-b border-stone-300 bg-ink text-white"><div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-2 px-4 py-3 sm:px-7">
      <h1 className="me-4 text-lg font-bold">{t('admin.nav.brand')}</h1>
      {navButton('dashboard', t('admin.nav.dashboard'), BarChart3)}
      {navButton('employees', t('admin.nav.employees'), UserRound)}
      {navButton('channels', t('admin.nav.channels'), Phone)}
      {navButton('reports', t('admin.nav.reports'), Files)}
      {navButton('customers', t('admin.nav.customers'), Users)}
      <label className="ms-auto flex items-center gap-2 text-xs font-semibold text-stone-200"><Languages size={16} /><span className="sr-only">{t('admin.language')}</span>
        <Select aria-label={t('admin.language')} className="h-9 !w-32 border-stone-600 !bg-stone-800 !text-white" value={locale} onChange={(e) => applyLocale(e.target.value as Locale)}>
          {locales.map((code) => <option key={code} value={code}>{t(`languages.${code}`)}</option>)}
        </Select>
      </label>
      <Button onClick={() => { window.location.href = '/' }}>{t('admin.nav.salesWorkspace')}</Button>
      <Button size="icon" aria-label={t('admin.nav.logout')} onClick={onLogout}><LogOut size={16} /></Button>
    </div></header>
    {view === 'dashboard' && <AdminAnalytics />}
    {view === 'employees' && <EmployeesAdmin />}
    {view === 'channels' && <ChannelsAdmin />}
    {view === 'reports' && <ReportsAdmin />}
    {view === 'customers' && <CustomersAdmin />}
  </div>
}
