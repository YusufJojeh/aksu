import { useEffect, useState } from 'react'
import { checkAdminSession } from '../../lib/adminApi'
import { AdminDashboard } from './AdminDashboard'
import { AdminLogin } from './AdminLogin'

export function AdminApp() {
  const [status, setStatus] = useState<'checking' | 'anonymous' | 'authenticated'>('checking')

  useEffect(() => {
    checkAdminSession()
      .then((authenticated) => setStatus(authenticated ? 'authenticated' : 'anonymous'))
      .catch(() => setStatus('anonymous'))
  }, [])

  if (status === 'checking') return <div className="grid min-h-screen place-items-center bg-parchment text-sm text-stone-500">Loading…</div>
  if (status === 'anonymous') return <AdminLogin onSuccess={() => setStatus('authenticated')} />
  return <AdminDashboard onLogout={() => setStatus('anonymous')} />
}
