import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listChannels, listEmployees, listReportEvents, listReports, type ArchivedReport, type CommunicationChannel, type ReportEvent } from '../../lib/operations'
import type { EmployeeProfile } from '../../auth/types'
import { Accordion, AccordionField, AccordionItem } from '../ui'

export function AdminAnalytics() {
  const { t } = useTranslation()
  const [reports, setReports] = useState<ArchivedReport[]>([])
  const [employees, setEmployees] = useState<EmployeeProfile[]>([])
  const [channels, setChannels] = useState<CommunicationChannel[]>([])
  const [events, setEvents] = useState<ReportEvent[]>([])
  const [error, setError] = useState<string>()
  useEffect(() => { void Promise.all([listReports(), listEmployees(), listChannels(), listReportEvents()]).then(([r, e, c, v]) => { setReports(r); setEmployees(e); setChannels(c); setEvents(v) }).catch(() => setError(t('admin.dashboard.loadError'))) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const week = new Date(today); week.setDate(today.getDate() - ((today.getDay() + 6) % 7)); const month = new Date(now.getFullYear(), now.getMonth(), 1)
  const counts = useMemo(() => ({ today: reports.filter((r) => new Date(r.finalized_at) >= today).length, week: reports.filter((r) => new Date(r.finalized_at) >= week).length, month: reports.filter((r) => new Date(r.finalized_at) >= month).length }), [reports]) // eslint-disable-line react-hooks/exhaustive-deps
  const grouped = (key: 'clinic_id' | 'document_locale') => Object.entries(reports.reduce<Record<string, number>>((acc, report) => { acc[report[key]] = (acc[report[key]] ?? 0) + 1; return acc }, {}))
  return <main className="mx-auto max-w-[1500px] p-4 sm:p-7">
    <h1 className="text-2xl font-bold">{t('admin.dashboard.title')}</h1>
    {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
    <div className="mt-5 grid gap-4 sm:grid-cols-4">
      {[[t('admin.dashboard.totalFinalized'), reports.length], [t('admin.dashboard.today'), counts.today], [t('admin.dashboard.thisWeek'), counts.week], [t('admin.dashboard.thisMonth'), counts.month]].map(([label, count]) => <div key={String(label)} className="rounded-xl border bg-white p-5"><p className="text-xs uppercase text-stone-500">{label}</p><p className="text-3xl font-bold">{count}</p></div>)}
    </div>
    <div className="mt-5 grid gap-4 lg:grid-cols-3">
      <div className="rounded-xl border bg-white p-5 lg:col-span-2">
        <h2 className="font-bold">{t('admin.dashboard.perEmployee')}</h2>
        <div className="mt-3 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[650px] text-sm">
            <thead><tr className="text-left text-stone-500"><th>{t('admin.dashboard.colName')}</th><th>{t('admin.dashboard.colStatus')}</th><th>{t('admin.dashboard.colReports')}</th><th>{t('admin.dashboard.colDownloads')}</th><th>{t('admin.dashboard.colActivity')}</th><th>{t('admin.dashboard.colPhone')}</th></tr></thead>
            <tbody>{employees.map((employee) => {
              const own = reports.filter((r) => r.created_by_employee_id === employee.id)
              const reportIds = new Set(own.map((r) => r.id))
              const downloads = events.filter((event) => reportIds.has(event.report_id) && event.event_type.includes('downloaded')).length
              const phone = channels.find((channel) => channel.current_assignment?.employee_id === employee.id)?.phone_e164
              return <tr key={employee.id} className="border-t">
                <td className="py-2 font-medium">{employee.full_name}</td>
                <td>{t(`admin.status.${employee.status}`)}</td>
                <td>{own.length}</td>
                <td>{downloads}</td>
                <td>{own.length ? `${new Date(own.at(-1)!.finalized_at).toLocaleDateString()} / ${new Date(own[0]!.finalized_at).toLocaleDateString()}` : '—'}</td>
                <td>{phone ?? '—'}</td>
              </tr>
            })}</tbody>
          </table>
        </div>
        <div className="mt-3 md:hidden">
          <Accordion>{employees.map((employee) => {
            const own = reports.filter((r) => r.created_by_employee_id === employee.id)
            const reportIds = new Set(own.map((r) => r.id))
            const downloads = events.filter((event) => reportIds.has(event.report_id) && event.event_type.includes('downloaded')).length
            const phone = channels.find((channel) => channel.current_assignment?.employee_id === employee.id)?.phone_e164
            return <AccordionItem key={employee.id} summary={<>
              <span className="font-semibold">{employee.full_name}</span>
              <span className="ms-2 text-xs text-stone-500">{t(`admin.status.${employee.status}`)}</span>
            </>}>
              <AccordionField label={t('admin.dashboard.colReports')}>{own.length}</AccordionField>
              <AccordionField label={t('admin.dashboard.colDownloads')}>{downloads}</AccordionField>
              <AccordionField label={t('admin.dashboard.colActivity')}>{own.length ? `${new Date(own.at(-1)!.finalized_at).toLocaleDateString()} / ${new Date(own[0]!.finalized_at).toLocaleDateString()}` : '—'}</AccordionField>
              <AccordionField label={t('admin.dashboard.colPhone')}>{phone ?? '—'}</AccordionField>
            </AccordionItem>
          })}</Accordion>
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-xl border bg-white p-5"><h2 className="font-bold">{t('admin.dashboard.reportsPerClinic')}</h2>{grouped('clinic_id').map(([key, value]) => <p key={key} className="mt-2 flex justify-between"><span>{t(`admin.clinic.${key}`)}</span><b>{value}</b></p>)}</div>
        <div className="rounded-xl border bg-white p-5"><h2 className="font-bold">{t('admin.dashboard.reportsPerLanguage')}</h2>{grouped('document_locale').map(([key, value]) => <p key={key} className="mt-2 flex justify-between"><span className="uppercase">{key}</span><b>{value}</b></p>)}</div>
      </div>
    </div>
  </main>
}
