import { FilePlus2, Files, LogOut, Shield, UserRound } from 'lucide-react'
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
  const { i18n } = useTranslation()
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
  return <div className="min-h-screen bg-parchment">
    <nav aria-label="Sales workspace" className="sticky top-0 z-40 flex flex-wrap items-center gap-2 border-b border-stone-300 bg-white px-4 py-2">
      <Button variant={view === 'create' ? 'primary' : 'outline'} onClick={() => setView('create')}><FilePlus2 size={16} />Create Report</Button>
      {signedIn && <Button variant={view === 'reports' ? 'primary' : 'outline'} onClick={() => setView('reports')}><Files size={16} />My Reports</Button>}
      {signedIn && <Button variant={view === 'profile' ? 'primary' : 'outline'} onClick={() => setView('profile')}><UserRound size={16} />Profile</Button>}
      <div className="ms-auto grid min-w-[220px] grid-cols-1 gap-2 sm:grid-cols-2">
        <Input aria-label="Sales name" placeholder="Your name" value={salesName} onChange={(event) => setSalesName(event.target.value)} disabled={signedIn} />
        <Input aria-label="Sales phone" placeholder="+905551112233" value={salesPhone} onChange={(event) => setSalesPhone(event.target.value)} disabled={signedIn} />
      </div>
      {auth.profile?.role === 'ADMIN' && <Button onClick={() => { window.location.href = '/admin' }}><Shield size={16} />Admin</Button>}
      {signedIn ? <Button size="icon" aria-label="Sign out" onClick={() => void auth.logout()}><LogOut size={16} /></Button> : <Button onClick={() => { window.location.href = '/admin' }}>Admin login</Button>}
    </nav>
    {view === 'create' && (!clinicId ? <ClinicSelect onSelect={setClinicId} /> : <ClinicWorkspace
      key={clinicId} clinicId={clinicId} profile={auth.profile} salesIdentity={{ fullName: salesName, phone: salesPhone }} initialReport={duplicate?.payload} parentReportId={duplicate?.parentReportId} interfaceLocale={interfaceLocale}
      onInterfaceLocaleChange={(locale) => { setInterfaceLocale(locale); void i18n.changeLanguage(locale); document.documentElement.lang=locale; document.documentElement.dir=isRtl(locale)?'rtl':'ltr' }} onSwitchClinic={() => setClinicId(undefined)}
    />)}
    {signedIn && view === 'reports' && <MyReports />}
    {signedIn && view === 'profile' && <SalesProfile />}
  </div>
}
