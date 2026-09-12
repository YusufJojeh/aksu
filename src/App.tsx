import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ClinicId } from './clinics/types'
import { AdminApp } from './components/admin/AdminApp'
import { ClinicSelect } from './components/ClinicSelect'
import { ClinicWorkspace } from './components/ClinicWorkspace'
import { EmployeeNameGate } from './components/EmployeeNameGate'
import type { Locale } from './domain/report'
import { getEmployeeName } from './lib/employeeSession'
import { isRtl } from './lib/locale'

const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')

export default function App() {
  const { i18n } = useTranslation()
  const [clinicId, setClinicId] = useState<ClinicId>()
  const [interfaceLocale, setInterfaceLocale] = useState<Locale>('en')
  const [employeeName, setEmployeeNameState] = useState(() => getEmployeeName())

  const changeInterfaceLanguage = (locale: Locale) => {
    setInterfaceLocale(locale)
    void i18n.changeLanguage(locale)
    document.documentElement.lang = locale
    document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr'
  }

  if (isAdminRoute) return <AdminApp />

  if (!employeeName) return <EmployeeNameGate onSubmit={setEmployeeNameState} />

  if (!clinicId) return <ClinicSelect onSelect={setClinicId} />

  return <ClinicWorkspace
    key={clinicId}
    clinicId={clinicId}
    employeeName={employeeName}
    interfaceLocale={interfaceLocale}
    onInterfaceLocaleChange={changeInterfaceLanguage}
    onSwitchClinic={() => setClinicId(undefined)}
  />
}
