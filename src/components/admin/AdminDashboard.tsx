import { BarChart3, Files, LogOut, Phone, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui'
import { AdminAnalytics } from './AdminAnalytics'
import { ChannelsAdmin } from './ChannelsAdmin'
import { EmployeesAdmin } from './EmployeesAdmin'
import { ReportsAdmin } from './ReportsAdmin'

type View = 'dashboard' | 'employees' | 'channels' | 'reports'

export function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [view, setView] = useState<View>('dashboard')
  return <div className="min-h-screen bg-parchment text-ink">
    <header className="border-b border-stone-300 bg-ink text-white"><div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-2 px-4 py-3 sm:px-7"><h1 className="me-4 text-lg font-bold">Dental Operations</h1>
      <Button variant={view === 'dashboard' ? 'primary' : 'outline'} onClick={() => setView('dashboard')}><BarChart3 size={16} />Dashboard</Button>
      <Button variant={view === 'employees' ? 'primary' : 'outline'} onClick={() => setView('employees')}><UserRound size={16} />Employees</Button>
      <Button variant={view === 'channels' ? 'primary' : 'outline'} onClick={() => setView('channels')}><Phone size={16} />Communication Numbers</Button>
      <Button variant={view === 'reports' ? 'primary' : 'outline'} onClick={() => setView('reports')}><Files size={16} />Reports</Button>
      <Button className="ms-auto" onClick={() => { window.location.href = '/' }}>Sales workspace</Button><Button size="icon" aria-label="Log out" onClick={onLogout}><LogOut size={16} /></Button>
    </div></header>
    {view === 'dashboard' && <AdminAnalytics />}
    {view === 'employees' && <EmployeesAdmin />}
    {view === 'channels' && <ChannelsAdmin />}
    {view === 'reports' && <ReportsAdmin />}
  </div>
}
