import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthProvider'
import { Button, Field, Input } from './ui'

export function ProfileSettings() {
  const auth = useAuth()
  const { t } = useTranslation()
  const [name, setName] = useState(auth.profile?.full_name ?? '')
  const [email, setEmail] = useState(auth.profile?.email ?? '')
  const [phone, setPhone] = useState(auth.profile?.requested_phone_e164 ?? '')
  const [message, setMessage] = useState<string>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(auth.profile?.full_name ?? '')
    setEmail(auth.profile?.email ?? '')
    setPhone(auth.profile?.requested_phone_e164 ?? '')
  }, [auth.profile?.email, auth.profile?.full_name, auth.profile?.requested_phone_e164])

  if (!auth.profile) return null

  const save = async () => {
    setSaving(true)
    setMessage(undefined)
    try {
      const result = await auth.updateProfile({ fullName: name, email, workPhone: phone })
      setMessage(result.emailChangeRequested ? t('profile.savedEmailPending') : t('profile.saved'))
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : t('profile.failed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl p-4 sm:p-7">
      <h1 className="text-2xl font-bold">{t('profile.title')}</h1>
      <form className="mt-5 grid gap-4 rounded-xl border border-stone-200 bg-white p-5" onSubmit={(event) => { event.preventDefault(); void save() }}>
        <Field label={t('profile.fullName')}><Input required value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <Field label={t('profile.email')}><Input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
        <Field label={t('profile.workPhone')}><Input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></Field>
        <p className="text-xs text-stone-500">{t('profile.hint')}</p>
        {message && <p role="status" className="text-sm">{message}</p>}
        <Button type="submit" variant="primary" disabled={saving} aria-busy={saving}>{saving ? t('profile.saving') : t('profile.save')}</Button>
      </form>
    </main>
  )
}
