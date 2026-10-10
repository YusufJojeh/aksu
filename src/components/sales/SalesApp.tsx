import { FilePlus2, Files, LogIn, LogOut, Shield, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/AuthProvider'
import type { ClinicId } from '../../clinics/types'
import type { Locale } from '../../domain/report'
import { isRtl } from '../../lib/locale'
import { ClinicSelect } from '../ClinicSelect'
import { ClinicWorkspace } from '../ClinicWorkspace'
import { Button, Input } from '../ui'
import { MyReports } from './MyReports'
import { SalesProfile } from './SalesProfile'

type View = 'create' | 'reports' | 'profile'

export function SalesApp() {
  const auth = useAuth()
  const { t, i18n } = useTranslation()
  const [salesName, setSalesName] = useState(auth.profile?.full_name ?? '')
  const [salesPhone, setSalesPhone] = useState(auth.profile?.requested_phone_e164 ?? '')
  const [duplicate] = useState(() => {
    try {
      const value = JSON.parse(sessionStorage.getItem('duplicateReport') ?? 'null') as { payload: import('../../domain/report').ReportData; parentReportId: string } | null
      sessionStorage.removeItem('duplicateReport')
      return value
    } catch { return null }
  })
  const [view, setView] = useState<View>('create')
  const [clinicId, setClinicId] = useState<ClinicId | undefined>(duplicate?.payload.clinicId)
  const [interfaceLocale, setInterfaceLocale] = useState<Locale>('en')
  useEffect(() => {
    if (!auth.profile) return
    setSalesName(auth.profile.full_name)
    setSalesPhone(auth.profile.requested_phone_e164)
  }, [auth.profile])
  const signedIn = Boolean(auth.profile)
  const [signingIn, setSigningIn] = useState(false)
  const [signInError, setSignInError] = useState<string>()
  const signIn = async () => {
    setSigningIn(true); setSignInError(undefined)
    try { await auth.loginWithPhone(salesPhone); if (!clinicId) setView('reports') }
    catch (caught) { setSignInError(caught instanceof Error ? caught.message : t('sales.errors.signInFailed')) }
    finally { setSigningIn(false) }
  }
  const inWorkspace = view === 'create' && Boolean(clinicId)
  return <div className={`flex min-h-dvh flex-col bg-parchment ${inWorkspace ? 'lg:h-dvh' : ''}`}>
    <nav aria-label={t('sales.nav.label')} className="z-40 shrink-0 border-b border-stone-300 bg-white px-4 py-2 sm:sticky sm:top-0 sm:px-7">
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          <Button variant={view === 'create' ? 'primary' : 'outline'} aria-current={view === 'create' ? 'page' : undefined} onClick={() => setView('create')}><FilePlus2 size={16} />{t('sales.nav.create')}</Button>
          {signedIn && <Button variant={view === 'reports' ? 'primary' : 'outline'} aria-current={view === 'reports' ? 'page' : undefined} onClick={() => setView('reports')}><Files size={16} />{t('sales.nav.reports')}</Button>}
          {signedIn && <Button variant={view === 'profile' ? 'primary' : 'outline'} aria-current={view === 'profile' ? 'page' : undefined} onClick={() => setView('profile')}><UserRound size={16} />{t('sales.nav.profile')}</Button>}
        </div>
        <div className="order-last grid w-full grid-cols-2 gap-2 sm:order-none sm:ms-auto sm:flex sm:w-auto sm:items-center">
          <label className="grid gap-1 text-xs font-semibold text-stone-700 sm:flex sm:items-center sm:gap-2"><span className="sm:sr-only">{t('sales.identity.nameLabel')}</span><Input id="sales-identity-name" placeholder={t('sales.identity.namePlaceholder')} autoComplete="name" value={salesName} onChange={(event) => setSalesName(event.target.value)} disabled={signedIn} className="sm:w-40 lg:w-48" /></label>
          <label className="grid gap-1 text-xs font-semibold text-stone-700 sm:flex sm:items-center sm:gap-2"><span className="sm:sr-only">{t('sales.identity.phoneLabel')}</span><Input id="sales-identity-phone" placeholder={t('sales.identity.phonePlaceholder')} type="tel" inputMode="tel" autoComplete="tel" value={salesPhone} onChange={(event) => setSalesPhone(event.target.value)} disabled={signedIn} className="sm:w-40 lg:w-44" /></label>
          {!signedIn && <p className="col-span-2 text-xs text-stone-600 sm:sr-only">{t('sales.identity.hint')}</p>}
          {!signedIn && <Button variant="primary" className="col-span-2 whitespace-nowrap" disabled={signingIn || !salesPhone.trim()} aria-busy={signingIn} onClick={() => void signIn()}><LogIn size={16} />{t('sales.nav.signIn')}</Button>}
        </div>
        <div className="ms-auto flex items-center gap-2 sm:ms-0">
          {auth.profile?.role === 'ADMIN' && <Button onClick={() => { window.location.href = '/admin' }}><Shield size={16} />{t('sales.nav.admin')}</Button>}
          {signedIn ? <Button size="icon" aria-label={t('sales.nav.signOut')} title={t('sales.nav.signOut')} onClick={() => void auth.logout()}><LogOut size={16} /></Button> : <Button className="whitespace-nowrap" onClick={() => { window.location.href = '/admin' }}>{t('sales.nav.adminLogin')}</Button>}
        </div>
        {signInError && <p role="alert" className="order-last basis-full text-end text-sm text-red-700">{signInError}</p>}
      </div>
    </nav>
    {view === 'create' && !clinicId && <ClinicSelect onSelect={setClinicId} />}
    {/* Stays mounted while viewing reports or profile so unsaved edits survive the round trip. */}
    {clinicId && <div className={view === 'create' ? 'flex flex-1 flex-col lg:min-h-0' : 'hidden'}><ClinicWorkspace
      key={clinicId} clinicId={clinicId} profile={auth.profile} salesIdentity={{ fullName: salesName, phone: salesPhone }} initialReport={duplicate?.payload} parentReportId={duplicate?.parentReportId} interfaceLocale={interfaceLocale}
      onInterfaceLocaleChange={(locale) => { setInterfaceLocale(locale); void i18n.changeLanguage(locale); document.documentElement.lang=locale; document.documentElement.dir=isRtl(locale)?'rtl':'ltr' }} onSwitchClinic={() => setClinicId(undefined)}
    /></div>}
    {signedIn && view === 'reports' && <MyReports onCreate={() => setView('create')} />}
    {signedIn && view === 'profile' && <SalesProfile />}
  </div>
}
