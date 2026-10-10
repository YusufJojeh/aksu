import { useAuth } from './auth/AuthProvider'
import { AdminGate } from './components/admin/AdminGate'
import { SalesApp } from './components/sales/SalesApp'

export default function App() {
  const auth = useAuth()
  if (!auth.configured)
    return (
      <div className="grid min-h-screen place-items-center bg-parchment p-6">
        <div className="max-w-lg rounded-xl border border-red-200 bg-white p-6">
          <h1 className="text-xl font-bold">Secure backend not configured</h1>
          <p className="mt-2 text-sm text-stone-600">
            Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. The application will not accept patient data without its
            protected backend.
          </p>
        </div>
      </div>
    )
  if (window.location.pathname.startsWith('/admin')) return <AdminGate />
  return <SalesApp />
}
