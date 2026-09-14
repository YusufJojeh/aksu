import { useAuth } from './auth/AuthProvider'
import { AuthScreen } from './auth/AuthScreen'
import { AdminApp } from './components/admin/AdminApp'
import { SalesApp } from './components/sales/SalesApp'
import { Button } from './components/ui'

export default function App() {
  const auth = useAuth()
  if (!auth.configured) return <div className="grid min-h-screen place-items-center bg-parchment p-6"><div className="max-w-lg rounded-xl border border-red-200 bg-white p-6"><h1 className="text-xl font-bold">Secure backend not configured</h1><p className="mt-2 text-sm text-stone-600">Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. The application will not accept patient data without its protected backend.</p></div></div>
  if (window.location.pathname.startsWith('/admin')) {
    if (auth.loading) return <div className="grid min-h-screen place-items-center bg-parchment text-sm text-stone-600">Loading secure workspace…</div>
    if (!auth.profile) return <AuthScreen />
    if (auth.profile.status !== 'active') return <main className="grid min-h-screen place-items-center bg-parchment p-6"><div className="max-w-md rounded-xl border border-stone-200 bg-white p-6 text-center"><h1 className="text-xl font-bold capitalize">Account {auth.profile.status}</h1><p className="mt-2 text-sm text-stone-600">An administrator must activate this account before it can access admin tools.</p><Button className="mt-5" onClick={() => void auth.logout()}>Sign out</Button></div></main>
    return auth.profile.role === 'ADMIN' ? <AdminApp /> : <main className="grid min-h-screen place-items-center bg-parchment p-6"><div className="text-center"><h1 className="text-xl font-bold">Access denied</h1><Button className="mt-4" onClick={() => { window.location.href = '/' }}>Return to workspace</Button></div></main>
  }
  return <SalesApp />
}
