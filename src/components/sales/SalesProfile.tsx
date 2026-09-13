import { useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { Button, Field, Input } from '../ui'

export function SalesProfile() {
  const auth = useAuth()
  const [name, setName] = useState(auth.profile?.full_name ?? '')
  const [phone, setPhone] = useState(auth.profile?.requested_phone_e164 ?? '')
  const [message, setMessage] = useState<string>()
  if (!auth.profile) return null
  return <main className="mx-auto max-w-xl p-4 sm:p-7"><h1 className="text-2xl font-bold">Profile</h1><form className="mt-5 grid gap-4 rounded-xl border border-stone-200 bg-white p-5" onSubmit={(event) => { event.preventDefault(); void auth.updateProfile({ fullName: name, workPhone: phone }).then(() => setMessage('Profile updated.')).catch((caught: unknown) => setMessage(caught instanceof Error ? caught.message : 'Update failed.')) }}><Field label="Full name"><Input required value={name} onChange={(event) => setName(event.target.value)} /></Field><Field label="Email"><Input disabled value={auth.profile.email} /></Field><Field label="Requested work / WhatsApp number"><Input required value={phone} onChange={(event) => setPhone(event.target.value)} /></Field><p className="text-xs text-stone-500">An administrator controls assignment of company communication numbers.</p>{message && <p role="status" className="text-sm">{message}</p>}<Button type="submit" variant="primary">Save profile</Button></form></main>
}
