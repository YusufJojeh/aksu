import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ClinicId } from './clinics/types'
import { ClinicSelect } from './components/ClinicSelect'
import { ClinicWorkspace } from './components/ClinicWorkspace'
import type { Locale } from './domain/report'
import { isRtl } from './lib/locale'

export default function App() {
  const { i18n } = useTranslation()
  const [clinicId, setClinicId] = useState<ClinicId>()
  const [interfaceLocale, setInterfaceLocale] = useState<Locale>('en')

  const changeInterfaceLanguage = (locale: Locale) => {
    setInterfaceLocale(locale)
    void i18n.changeLanguage(locale)
    document.documentElement.lang = locale
    document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr'
  }

  if (!clinicId) return <ClinicSelect onSelect={setClinicId} />

  return <ClinicWorkspace
    key={clinicId}
    clinicId={clinicId}
    interfaceLocale={interfaceLocale}
    onInterfaceLocaleChange={changeInterfaceLanguage}
    onSwitchClinic={() => setClinicId(undefined)}
  />
}
