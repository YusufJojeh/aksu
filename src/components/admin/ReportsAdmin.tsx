import { Download, Copy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { downloadArchivedReport, listChannels, listEmployees, listReports, type ArchivedReport, type CommunicationChannel } from '../../lib/operations'
import type { EmployeeProfile } from '../../auth/types'
import { locales } from '../../domain/report'
import { Accordion, AccordionField, AccordionItem, Button, Input, Select } from '../ui'

export function ReportsAdmin() {
  const { t } = useTranslation()
  const [reports, setReports] = useState<ArchivedReport[]>([]); const [employees, setEmployees] = useState<EmployeeProfile[]>([]); const [channels, setChannels] = useState<CommunicationChannel[]>([]); const [query, setQuery] = useState(''); const [clinic, setClinic] = useState(''); const [locale, setLocale] = useState(''); const [employee, setEmployee] = useState(''); const [phone, setPhone] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [error, setError] = useState<string>()
  useEffect(() => { void Promise.all([listReports(), listEmployees(), listChannels()]).then(([r, e, c]) => { setReports(r); setEmployees(e); setChannels(c) }).catch(() => setError(t('admin.reports.loadError'))) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const visible = useMemo(() => reports.filter((r) => (!query || `${r.patient_name} ${r.patient_phone}`.toLowerCase().includes(query.toLowerCase())) && (!clinic || r.clinic_id === clinic) && (!locale || r.document_locale === locale) && (!employee || r.created_by_employee_id === employee) && (!phone || r.employee_phone_snapshot.includes(phone)) && (!from || r.finalized_at >= from) && (!to || r.finalized_at <= `${to}T23:59:59`)), [reports, query, clinic, locale, employee, phone, from, to])
  const save = async (report: ArchivedReport) => { const blob = await downloadArchivedReport(report); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${report.id}.pdf`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
  return <main className="mx-auto w-full min-w-0 max-w-[1500px] p-4 sm:p-7">
    <h1 className="text-2xl font-bold">{t('admin.reports.title')}</h1>
    <div className="mt-4 grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      <Input aria-label={t('admin.reports.searchLabel')} placeholder={t('admin.reports.searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
      <Select aria-label={t('admin.reports.clinicFilterLabel')} value={clinic} onChange={(e) => setClinic(e.target.value)}>
        <option value="">{t('admin.common.allClinics')}</option>
        <option value="aksu">{t('admin.clinic.aksu')}</option>
        <option value="mb-dental">{t('admin.clinic.mb-dental')}</option>
      </Select>
      <Select aria-label={t('admin.reports.languageFilterLabel')} value={locale} onChange={(e) => setLocale(e.target.value)}>
        <option value="">{t('admin.common.allLanguages')}</option>
        {locales.map((v) => <option key={v} value={v}>{t(`languages.${v}`)}</option>)}
      </Select>
      <Select aria-label={t('admin.reports.employeeFilterLabel')} value={employee} onChange={(e) => setEmployee(e.target.value)}>
        <option value="">{t('admin.reports.allEmployees')}</option>
        {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name} ({t(`admin.status.${e.status}`)})</option>)}
      </Select>
      <Input aria-label={t('admin.reports.phoneFilterLabel')} placeholder={t('admin.reports.phoneFilterPlaceholder')} value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Input aria-label={t('admin.reports.fromLabel')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      <Input aria-label={t('admin.reports.toLabel')} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
    </div>
    {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
    <div className="mt-4 hidden overflow-x-auto rounded-xl border bg-white md:block">
      <table className="w-full min-w-[1250px] text-left text-xs">
        <thead><tr className="border-b text-stone-500">
          <th className="p-3">{t('admin.reports.colReport')}</th><th>{t('admin.reports.colClinicLanguage')}</th><th>{t('admin.reports.colDateTotals')}</th><th>{t('admin.reports.colOriginalEmployee')}</th><th>{t('admin.reports.colHistoricalPhone')}</th><th>{t('admin.reports.colCurrentOwner')}</th><th>{t('admin.reports.colPdf')}</th>
        </tr></thead>
        <tbody>{visible.map((r) => {
          const emp = employees.find((e) => e.id === r.created_by_employee_id)
          const channel = channels.find((c) => c.id === r.communication_channel_id)
          return <tr key={r.id} className="border-b align-top">
            <td className="p-3"><b>{r.patient_name}</b><br />{r.patient_phone}<br /><span className="text-stone-500">{r.id}</span></td>
            <td>{t(`admin.clinic.${r.clinic_id}`)}<br /><span className="uppercase">{r.document_locale}</span></td>
            <td>{new Date(r.finalized_at).toLocaleString()}<br />{(r.first_visit_total_minor + r.second_visit_total_minor) / 100} {r.currency}</td>
            <td>{r.employee_name_snapshot}<br /><span className="text-stone-500">{emp ? t(`admin.status.${emp.status}`) : t('admin.common.historical')}</span></td>
            <td>{r.employee_phone_snapshot}</td>
            <td>{channel?.current_assignment?.profile?.full_name ?? t('admin.common.unassigned')}</td>
            <td className="flex gap-1">
              <Button size="icon" aria-label={`${t('admin.reports.download')} ${r.id}`} onClick={() => void save(r).catch(() => setError(t('admin.reports.downloadFailed')))}><Download size={15} /></Button>
              <Button size="icon" aria-label={`${t('admin.reports.duplicate')} ${r.id}`} title={t('admin.reports.duplicate')} onClick={() => { sessionStorage.setItem('duplicateReport', JSON.stringify({ payload: r.report_payload, parentReportId: r.id })); window.location.href = '/' }}><Copy size={15} /></Button>
            </td>
          </tr>
        })}</tbody>
      </table>
    </div>
    <div className="mt-4 md:hidden">
      <Accordion>{visible.map((r) => {
        const emp = employees.find((e) => e.id === r.created_by_employee_id)
        const channel = channels.find((c) => c.id === r.communication_channel_id)
        return <AccordionItem key={r.id} summary={<>
          <span className="font-semibold">{r.patient_name}</span>
          <span className="ms-2 text-xs text-stone-500">{new Date(r.finalized_at).toLocaleDateString()}</span>
        </>}>
          <AccordionField label={t('admin.reports.colReport')}>{r.patient_name}<br />{r.patient_phone}<br /><span className="text-stone-500">{r.id}</span></AccordionField>
          <AccordionField label={t('admin.reports.colClinicLanguage')}>{t(`admin.clinic.${r.clinic_id}`)} · <span className="uppercase">{r.document_locale}</span></AccordionField>
          <AccordionField label={t('admin.reports.colDateTotals')}>{new Date(r.finalized_at).toLocaleString()}<br />{(r.first_visit_total_minor + r.second_visit_total_minor) / 100} {r.currency}</AccordionField>
          <AccordionField label={t('admin.reports.colOriginalEmployee')}>{r.employee_name_snapshot}<br /><span className="text-stone-500">{emp ? t(`admin.status.${emp.status}`) : t('admin.common.historical')}</span></AccordionField>
          <AccordionField label={t('admin.reports.colHistoricalPhone')}>{r.employee_phone_snapshot}</AccordionField>
          <AccordionField label={t('admin.reports.colCurrentOwner')}>{channel?.current_assignment?.profile?.full_name ?? t('admin.common.unassigned')}</AccordionField>
          <AccordionField label={t('admin.reports.colPdf')}>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => void save(r).catch(() => setError(t('admin.reports.downloadFailed')))}><Download size={15} />{t('admin.reports.download')}</Button>
              <Button className="flex-1" onClick={() => { sessionStorage.setItem('duplicateReport', JSON.stringify({ payload: r.report_payload, parentReportId: r.id })); window.location.href = '/' }}><Copy size={15} />{t('admin.reports.duplicate')}</Button>
            </div>
          </AccordionField>
        </AccordionItem>
      })}</Accordion>
    </div>
  </main>
}
