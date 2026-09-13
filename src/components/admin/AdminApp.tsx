import { useAuth } from '../../auth/AuthProvider'
import { AdminDashboard } from './AdminDashboard'

export function AdminApp() {
  const auth = useAuth()
  return <AdminDashboard onLogout={() => void auth.logout()} />
}
