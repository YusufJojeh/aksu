import { FileText } from 'lucide-react'
import { useState } from 'react'
import { adminLogin } from '../../lib/adminApi'
import { Button, Field, Input } from '../ui'

export function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    setSubmitting(true)
    setError(undefined)
    try {
      await adminLogin(passcode)
      onSuccess()
    } catch {
      setError('Incorrect passcode.')
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="grid min-h-screen place-items-center bg-parchment p-6 text-ink">
    <form className="w-full max-w-sm" onSubmit={(event) => { event.preventDefault(); void submit() }}>
      <div className="mb-8 text-center">
        <span className="mx-auto mb-3 grid size-12 place-items-center rounded-full border border-gold/70 text-gold"><FileText size={22} /></span>
        <h1 className="text-2xl font-bold tracking-tight">Admin dashboard</h1>
        <p className="mt-1 text-sm text-stone-600">Enter the admin passcode to continue.</p>
      </div>
      <Field label="Passcode" error={error}>
        <Input autoFocus type="password" value={passcode} onChange={(event) => setPasscode(event.target.value)} />
      </Field>
      <Button type="submit" variant="primary" className="mt-4 w-full" disabled={submitting || !passcode}>
        {submitting ? 'Checking…' : 'Sign in'}
      </Button>
    </form>
  </div>
}
