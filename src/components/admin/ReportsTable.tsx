import { Download } from 'lucide-react'
import { reportFileUrl, type ReportLogEntry } from '../../lib/adminApi'
import { Button } from '../ui'

export function ReportsTable({ reports, loading }: { reports: ReportLogEntry[]; loading: boolean }) {
  if (loading) return <p className="px-5 py-6 text-sm text-stone-500">Loading reports…</p>
  if (reports.length === 0) return <p className="px-5 py-6 text-sm text-stone-500">No reports match these filters.</p>

  return <div className="overflow-x-auto">
    <table className="w-full min-w-[720px] text-left text-sm">
      <thead className="border-b border-stone-200 text-xs font-semibold uppercase tracking-wide text-stone-500">
        <tr>
          <th className="px-4 py-3">Employee</th>
          <th className="px-4 py-3">Clinic</th>
          <th className="px-4 py-3">Patient</th>
          <th className="px-4 py-3">Locale</th>
          <th className="px-4 py-3">Created</th>
          <th className="px-4 py-3" />
        </tr>
      </thead>
      <tbody className="divide-y divide-stone-100">
        {reports.map((report) => <tr key={report.id}>
          <td className="px-4 py-3 font-medium">{report.employee_name}</td>
          <td className="px-4 py-3">{report.clinic_id}</td>
          <td className="px-4 py-3">{report.patient_name || '—'}</td>
          <td className="px-4 py-3 uppercase">{report.locale}</td>
          <td className="px-4 py-3 text-stone-500">{new Date(report.created_at).toLocaleString()}</td>
          <td className="px-4 py-3 text-end">
            <a href={reportFileUrl(report.id)} target="_blank" rel="noreferrer">
              <Button variant="outline" size="icon" aria-label="Download PDF"><Download size={16} /></Button>
            </a>
          </td>
        </tr>)}
      </tbody>
    </table>
  </div>
}
