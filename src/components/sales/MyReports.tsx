import { Download, PencilLine } from 'lucide-react'
import { useEffect, useState } from 'react'
import { downloadArchivedReport, listReports, type ArchivedReport } from '../../lib/operations'
import { archivedReportFilename } from '../../lib/filename'
import { Accordion, AccordionField, AccordionItem, Button } from '../ui'

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; document.body.appendChild(anchor); anchor.click(); anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

// Finalized reports are immutable: editing opens the form pre-filled and saves a new copy linked
// to the original (parent_report_id), so both versions and the edit date stay on record.
function edit(report: ArchivedReport) {
  sessionStorage.setItem('duplicateReport', JSON.stringify({ payload: report.report_payload, parentReportId: report.id }))
  window.location.href = '/'
}

function EditedBadge({ report }: { report: ArchivedReport }) {
  return report.parent_report_id ? <span className="ms-2 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-800">Edited copy</span> : null
}

export function MyReports() {
  const [downloading, setDownloading] = useState(false)
  const [reports, setReports] = useState<ArchivedReport[]>([])
  const [error, setError] = useState<string>()
  useEffect(() => { void listReports().then(setReports).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Unable to load reports.')) }, [])
  const download = async (report: ArchivedReport) => {
    setError(undefined); setDownloading(true)
    try {
      const blob = await downloadArchivedReport(report)
      const name = archivedReportFilename(report)
      save(blob, name)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Download failed.') }
    finally { setDownloading(false) }
  }
  return <main className="mx-auto max-w-6xl p-4 sm:p-7"><h1 className="text-2xl font-bold">My Reports</h1>{error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
    <div className="mt-5 hidden overflow-x-auto rounded-xl border border-stone-200 bg-white md:block"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b text-stone-500"><th className="p-3">Customer</th><th>Clinic</th><th>Date</th><th>Language</th><th>Totals</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{reports.map((report) => <tr key={report.id} className="border-b"><td className="p-3 font-medium">{report.patient_name}<EditedBadge report={report} /></td><td>{report.clinic_id}</td><td>{new Date(report.finalized_at).toLocaleDateString()}</td><td className="uppercase">{report.document_locale}</td><td>{(report.first_visit_total_minor + report.second_visit_total_minor) / 100} {report.currency}</td><td className="p-2 text-end"><div className="flex justify-end gap-1"><Button size="icon" aria-label={`Edit ${report.patient_name}`} title="Edit (saves a new copy)" onClick={() => edit(report)}><PencilLine size={16} /></Button><Button size="icon" aria-label={`Download ${report.patient_name}`} disabled={downloading} onClick={() => void download(report)}><Download size={16} /></Button></div></td></tr>)}</tbody></table>{!error && reports.length === 0 && <p className="p-5 text-sm text-stone-500">No finalized reports yet.</p>}</div>
    <div className="mt-5 md:hidden">
      <Accordion>{reports.map((report) => <AccordionItem key={report.id} summary={<>
        <span className="font-semibold">{report.patient_name}</span>
        <span className="ms-2 text-xs text-stone-500">{new Date(report.finalized_at).toLocaleDateString()}</span>
        <EditedBadge report={report} />
      </>}>
        <AccordionField label="Clinic">{report.clinic_id}</AccordionField>
        <AccordionField label="Language"><span className="uppercase">{report.document_locale}</span></AccordionField>
        <AccordionField label="Totals">{(report.first_visit_total_minor + report.second_visit_total_minor) / 100} {report.currency}</AccordionField>
        <div className="flex gap-2"><Button className="flex-1" onClick={() => edit(report)}><PencilLine size={16} />Edit</Button><Button className="flex-1" disabled={downloading} onClick={() => void download(report)}><Download size={16} />Download</Button></div>
      </AccordionItem>)}</Accordion>
      {!error && reports.length === 0 && <p className="rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-500">No finalized reports yet.</p>}
    </div>
  </main>
}
