import { LogOut } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { clinicRegistry } from '../../clinics/registry'
import { clinicIds } from '../../clinics/types'
import { adminLogout, fetchAnalytics, fetchReports, type AnalyticsResponse, type ReportLogEntry } from '../../lib/adminApi'
import { Button, Input, Select } from '../ui'
import { AnalyticsPanel } from './AnalyticsPanel'
import { ReportsTable } from './ReportsTable'

export function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [reports, setReports] = useState<ReportLogEntry[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsResponse>()
  const [loading, setLoading] = useState(true)
  const [employeeName, setEmployeeNameFilter] = useState('')
  const [clinicId, setClinicIdFilter] = useState('')

  const loadReports = useCallback((filters: { employeeName?: string; clinicId?: string }) => {
    setLoading(true)
    fetchReports(filters)
      .then(setReports)
      .catch((error: unknown) => console.error('Failed to load reports', error))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadReports({})
    fetchAnalytics().then(setAnalytics).catch((error: unknown) => console.error('Failed to load analytics', error))
  }, [loadReports])

  const applyFilters = () => loadReports({ employeeName: employeeName || undefined, clinicId: clinicId || undefined })

  const logout = async () => {
    await adminLogout()
    onLogout()
  }

  return <div className="min-h-screen bg-parchment text-ink">
    <header className="border-b border-stone-300 bg-ink text-white">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-4 sm:px-7">
        <h1 className="text-lg font-bold tracking-tight">Admin dashboard</h1>
        <Button variant="outline" className="!border-stone-600 !bg-stone-800 !text-white hover:!bg-stone-700" onClick={() => void logout()}>
          <LogOut size={16} />Log out
        </Button>
      </div>
    </header>
    <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-7">
      <AnalyticsPanel analytics={analytics} />
      <div className="rounded-xl border border-stone-200 bg-white">
        <div className="flex flex-wrap items-end gap-3 border-b border-stone-200 px-5 py-4">
          <label className="grid gap-1 text-xs font-semibold text-stone-600">
            Employee
            <Input className="w-48" value={employeeName} onChange={(event) => setEmployeeNameFilter(event.target.value)} placeholder="Filter by employee" />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-stone-600">
            Clinic
            <Select className="w-48" value={clinicId} onChange={(event) => setClinicIdFilter(event.target.value)}>
              <option value="">All clinics</option>
              {clinicIds.map((id) => <option key={id} value={id}>{clinicRegistry[id].displayName}</option>)}
            </Select>
          </label>
          <Button variant="primary" onClick={applyFilters}>Apply</Button>
        </div>
        <ReportsTable reports={reports} loading={loading} />
      </div>
    </main>
  </div>
}
