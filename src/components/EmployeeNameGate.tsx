import { FileText } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { setEmployeeName } from '../lib/employeeSession'
import { Button, Field, Input } from './ui'

export function EmployeeNameGate({ onSubmit }: { onSubmit: (name: string) => void }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [touched, setTouched] = useState(false)
  const trimmed = name.trim()

  const submit = () => {
    setTouched(true)
    if (!trimmed) return
    setEmployeeName(trimmed)
    onSubmit(trimmed)
  }

  return <div className="grid min-h-screen place-items-center bg-parchment p-6 text-ink">
    <form className="w-full max-w-sm" onSubmit={(event) => { event.preventDefault(); submit() }}>
      <div className="mb-8 text-center">
        <span className="mx-auto mb-3 grid size-12 place-items-center rounded-full border border-gold/70 text-gold"><FileText size={22} /></span>
        <h1 className="text-2xl font-bold tracking-tight">{t('employeeGate.title')}</h1>
        <p className="mt-1 text-sm text-stone-600">{t('employeeGate.subtitle')}</p>
      </div>
      <Field label={t('employeeGate.nameLabel')} error={touched && !trimmed ? t('employeeGate.nameRequired') : undefined}>
        <Input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder={t('employeeGate.namePlaceholder')} />
      </Field>
      <Button type="submit" variant="primary" className="mt-4 w-full">{t('employeeGate.continue')}</Button>
    </form>
  </div>
}
