import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Languages } from 'lucide-react'
import { Button, Field, Input, Select } from '../components/ui'
import { locales, type Locale } from '../domain/report'
import { useAuth } from './AuthProvider'
import { errorText } from '../i18n/errorText'

// Each language is listed in its own script so the picker is usable before you can read the current one.
const endonym = (locale: Locale): string => {
  try {
    return new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? locale
  } catch {
    return locale
  }
}

// Administrator sign-in, by email and password only. There is no self-registration: admins create employee accounts, and
// sales staff sign in with their phone number alone on the workspace (/).
export function AuthScreen({ locale, onLocaleChange }: { locale: Locale; onLocaleChange: (locale: Locale) => void }) {
  const auth = useAuth()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError(undefined)
    try {
      await auth.loginAdmin(email, password)
    } catch (caught) {
      setError(errorText(caught, t, 'errors.sign_in_failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-parchment p-6 text-ink">
      <form
        className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <label className="mb-2 flex items-center justify-end gap-2 text-xs font-semibold text-stone-600">
          <Languages size={16} aria-hidden />
          <span className="sr-only">{t('fields.interfaceLanguage')}</span>
          <Select
            className="h-9 !w-auto"
            value={locale}
            onChange={(event) => onLocaleChange(event.target.value as Locale)}
          >
            {locales.map((code) => (
              <option key={code} value={code} lang={code}>
                {endonym(code)}
              </option>
            ))}
          </Select>
        </label>
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid size-12 place-items-center rounded-full border border-gold/70 text-gold">
            <FileText />
          </span>
          <h1 className="text-2xl font-bold">{t('adminAuth.title')}</h1>
        </div>
        <div className="grid gap-4">
          <Field label={t('adminAuth.email')}>
            <Input
              required
              type="email"
              dir="ltr"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label={t('adminAuth.password')}>
            <Input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" className="mt-5 w-full" disabled={busy}>
          {busy ? t('adminAuth.wait') : t('adminAuth.signIn')}
        </Button>
      </form>
    </main>
  )
}
