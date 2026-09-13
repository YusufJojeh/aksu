import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { downloadArchivedReport, listReports, type ArchivedReport } from '../../lib/operations'
import { reportFilename } from '../../lib/filename'
import { Button } from '../ui'

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function MyReports() {
  const [reports, setReports] = useState<ArchivedReport[]>([])
  const [error, setError] = useState<string>()
  useEffect(() => { void listReports().then(setReports).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Unable to load reports.')) }, [])
  return <main className="mx-auto max-w-6xl p-4 sm:p-7"><h1 className="text-2xl font-bold">My Reports</h1>{error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
    <div className="mt-5 overflow-x-auto rounded-xl border border-stone-200 bg-white"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b text-stone-500"><th className="p-3">Customer</th><th>Clinic</th><th>Date</th><th>Language</th><th>Totals</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{reports.map((report) => <tr key={report.id} className="border-b"><td className="p-3 font-medium">{report.patient_name}</td><td>{report.clinic_id}</td><td>{new Date(report.finalized_at).toLocaleDateString()}</td><td className="uppercase">{report.document_locale}</td><td>{(report.first_visit_total_minor + report.second_visit_total_minor) / 100} {report.currency}</td><td className="p-2 text-end"><Button size="icon" aria-label={`Download ${report.patient_name}`} onClick={() => void downloadArchivedReport(report).then((blob) => save(blob, reportFilename(report.clinic_id as 'aksu' | 'mb-dental', report.patient_name, report.finalized_at.slice(0, 10), report.document_locale as never))).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Download failed.'))}><Download size={16} /></Button></td></tr>)}</tbody></table>{!error && reports.length === 0 && <p className="p-5 text-sm text-stone-500">No finalized reports yet.</p>}</div>
  </main>
}
