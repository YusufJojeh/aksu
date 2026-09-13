import { useState } from 'react'
import { FileText } from 'lucide-react'
import { Button, Field, Input, Tabs, TabsList, TabsTrigger } from '../components/ui'
import { useAuth } from './AuthProvider'

export function AuthScreen() {
  const auth = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true); setError(undefined); setNotice(undefined)
    try {
      if (mode === 'login') await auth.login(email, password)
      else {
        await auth.register({ fullName, email, password, workPhone: phone })
        setNotice('Registration received. Confirm your email if requested, then wait for admin approval.')
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Authentication failed.') }
    finally { setBusy(false) }
  }

  return <main className="grid min-h-screen place-items-center bg-parchment p-6 text-ink">
    <form className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-sm" onSubmit={(event) => { event.preventDefault(); void submit() }}>
      <div className="mb-6 text-center"><span className="mx-auto mb-3 grid size-12 place-items-center rounded-full border border-gold/70 text-gold"><FileText /></span><h1 className="text-2xl font-bold">Dental Operations</h1></div>
      <Tabs value={mode} onValueChange={(value) => setMode(value as typeof mode)}><TabsList className="mb-5"><TabsTrigger value="login">Sign in</TabsTrigger><TabsTrigger value="register">Register</TabsTrigger></TabsList></Tabs>
      <div className="grid gap-4">
        {mode === 'register' && <Field label="Full name"><Input required minLength={2} autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} /></Field>}
        <Field label="Email"><Input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
        <Field label="Password"><Input required minLength={10} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
        {mode === 'register' && <Field label="Work / WhatsApp number (E.164)"><Input required type="tel" placeholder="+905551112233" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></Field>}
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-4 text-sm text-green-800">{notice}</p>}
      <Button type="submit" variant="primary" className="mt-5 w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create sales account'}</Button>
    </form>
  </main>
}
