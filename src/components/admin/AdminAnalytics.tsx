import { useEffect, useState } from 'react'
import { listChannels, listEmployees, listReportEvents, listReports, type ArchivedReport, type CommunicationChannel, type ReportEvent } from '../../lib/operations'
import type { EmployeeProfile } from '../../auth/types'

export function AdminAnalytics() {
  const [reports, setReports] = useState<ArchivedReport[]>([])
  const [employees, setEmployees] = useState<EmployeeProfile[]>([])
  const [channels, setChannels] = useState<CommunicationChannel[]>([])
  const [events, setEvents] = useState<ReportEvent[]>([])
  const [error, setError] = useState<string>()
  useEffect(() => { void Promise.all([listReports(), listEmployees(), listChannels(), listReportEvents()]).then(([r, e, c, v]) => { setReports(r); setEmployees(e); setChannels(c); setEvents(v) }).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Unable to load dashboard.')) }, [])
  const grouped = (key: 'clinic_id' | 'document_locale') => Object.entries(reports.reduce<Record<string, number>>((acc, report) => { acc[report[key]] = (acc[report[key]] ?? 0) + 1; return acc }, {}))
  return <main className="mx-auto w-full min-w-0 max-w-[1500px]">{error && <p role="alert" className="text-red-700">{error}</p>}
    <div className="grid min-w-0 gap-4 lg:grid-cols-3"><div className="min-w-0 rounded-xl border bg-white p-5 lg:col-span-2"><h2 className="font-bold">Per employee</h2><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[650px] text-sm"><thead><tr className="text-left text-stone-500"><th>Name</th><th>Status</th><th>Reports</th><th>Downloads</th><th>First / last activity</th><th>Current phone</th></tr></thead><tbody>{employees.map((employee) => { const own = reports.filter((r) => r.created_by_employee_id === employee.id); const reportIds = new Set(own.map((r) => r.id)); const downloads = events.filter((event) => reportIds.has(event.report_id) && event.event_type.includes('downloaded')).length; const phone = channels.find((channel) => channel.current_assignment?.employee_id === employee.id)?.phone_e164; return <tr key={employee.id} className="border-t"><td className="py-2 font-medium">{employee.full_name}</td><td>{employee.status}</td><td>{own.length}</td><td>{downloads}</td><td>{own.length ? `${new Date(own.at(-1)!.finalized_at).toLocaleDateString()} / ${new Date(own[0]!.finalized_at).toLocaleDateString()}` : '—'}</td><td>{phone ?? '—'}</td></tr> })}</tbody></table></div></div><div className="space-y-4"><div className="rounded-xl border bg-white p-5"><h2 className="font-bold">Reports per clinic</h2>{grouped('clinic_id').map(([key, value]) => <p key={key} className="mt-2 flex justify-between"><span>{key}</span><b>{value}</b></p>)}</div><div className="rounded-xl border bg-white p-5"><h2 className="font-bold">Reports per language</h2>{grouped('document_locale').map(([key, value]) => <p key={key} className="mt-2 flex justify-between"><span className="uppercase">{key}</span><b>{value}</b></p>)}</div></div></div>
  </main>
}
