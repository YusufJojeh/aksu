import { Copy, Download, LoaderCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  downloadArchivedReport,
  listChannels,
  listEmployees,
  listReports,
  type ArchivedReport,
  type CommunicationChannel,
} from '../../lib/operations'
import type { EmployeeProfile } from '../../auth/types'
import { archivedReportFilename } from '../../lib/filename'
import { saveBlob } from '../../lib/download'
import { locales, type Currency, type Locale } from '../../domain/report'
import { formatMoneyMinor, localeTags } from '../../lib/locale'
import { Accordion, AccordionField, AccordionItem, Button, Field, Input, Select } from '../ui'
import { errorText } from '../../i18n/errorText'

export function ReportsAdmin() {
  const { t, i18n } = useTranslation()
  const uiLocale = (i18n.language in localeTags ? i18n.language : 'en') as Locale
  const when = (value: string) =>
    new Date(value).toLocaleString(localeTags[uiLocale], { dateStyle: 'medium', timeStyle: 'short' })
  const day = (value: string) => new Date(value).toLocaleDateString(localeTags[uiLocale], { dateStyle: 'medium' })
  const total = (r: ArchivedReport) =>
    formatMoneyMinor(r.first_visit_total_minor + r.second_visit_total_minor, r.currency as Currency, uiLocale)
  const [loaded, setLoaded] = useState(false)
  const [downloading, setDownloading] = useState<string>()
  const [reports, setReports] = useState<ArchivedReport[]>([])
  const [employees, setEmployees] = useState<EmployeeProfile[]>([])
  const [channels, setChannels] = useState<CommunicationChannel[]>([])
  const [query, setQuery] = useState('')
  const [clinic, setClinic] = useState('')
  const [locale, setLocale] = useState('')
  const [employee, setEmployee] = useState('')
  const [phone, setPhone] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [type, setType] = useState<'' | 'original' | 'edited'>('')
  const [error, setError] = useState<string>()
  const byId = useMemo(() => new Map(reports.map((r) => [r.id, r])), [reports])
  const employeesById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees])
  const channelsById = useMemo(() => new Map(channels.map((c) => [c.id, c])), [channels])
  const duplicate = (r: ArchivedReport) => {
    sessionStorage.setItem('duplicateReport', JSON.stringify({ payload: r.report_payload, parentReportId: r.id }))
    window.location.href = '/'
  }
  const editedFrom = (r: ArchivedReport) => {
    if (!r.parent_report_id) return null
    const parent = byId.get(r.parent_report_id)
    return (
      <span className="mt-1 inline-block rounded-full border border-stone-300 bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700">
        {t('admin.reports.editedBadge')}
        {parent && <> · {t('admin.reports.editedFrom', { date: when(parent.finalized_at) })}</>}
      </span>
    )
  }
  useEffect(() => {
    void Promise.all([listReports(), listEmployees(), listChannels()])
      .then(([r, e, c]) => {
        setReports(r)
        setEmployees(e)
        setChannels(c)
      })
      .catch(() => setError(t('admin.reports.loadError')))
      .finally(() => setLoaded(true))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const visible = useMemo(
    () =>
      reports.filter(
        (r) =>
          (!query || `${r.patient_name} ${r.patient_phone}`.toLowerCase().includes(query.toLowerCase())) &&
          (!clinic || r.clinic_id === clinic) &&
          (!locale || r.document_locale === locale) &&
          (!employee || r.created_by_employee_id === employee) &&
          (!phone || r.employee_phone_snapshot.includes(phone)) &&
          (!from || r.finalized_at >= from) &&
          (!to || r.finalized_at <= `${to}T23:59:59`) &&
          (!type || (type === 'edited') === Boolean(r.parent_report_id)),
      ),
    [reports, query, clinic, locale, employee, phone, from, to, type],
  )
  const save = async (report: ArchivedReport) => {
    setError(undefined)
    setDownloading(report.id)
    try {
      saveBlob(await downloadArchivedReport(report), archivedReportFilename(report))
    } catch (caught) {
      setError(errorText(caught, t, 'admin.reports.downloadFailed'))
    } finally {
      setDownloading(undefined)
    }
  }
  return (
    <main className="mx-auto w-full min-w-0 max-w-[1500px] p-4 sm:p-7">
      <h1 className="text-2xl font-bold">{t('admin.reports.title')}</h1>
      <div className="mt-4 grid items-end gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          aria-label={t('admin.reports.searchLabel')}
          placeholder={t('admin.reports.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select
          aria-label={t('admin.reports.clinicFilterLabel')}
          value={clinic}
          onChange={(e) => setClinic(e.target.value)}
        >
          <option value="">{t('admin.common.allClinics')}</option>
          <option value="aksu">{t('admin.clinic.aksu')}</option>
          <option value="mb-dental">{t('admin.clinic.mb-dental')}</option>
        </Select>
        <Select
          aria-label={t('admin.reports.languageFilterLabel')}
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
        >
          <option value="">{t('admin.common.allLanguages')}</option>
          {locales.map((v) => (
            <option key={v} value={v}>
              {t(`languages.${v}`)}
            </option>
          ))}
        </Select>
        <Select
          aria-label={t('admin.reports.employeeFilterLabel')}
          value={employee}
          onChange={(e) => setEmployee(e.target.value)}
        >
          <option value="">{t('admin.reports.allEmployees')}</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.full_name} ({t(`admin.status.${e.status}`)})
            </option>
          ))}
        </Select>
        <Input
          aria-label={t('admin.reports.phoneFilterLabel')}
          placeholder={t('admin.reports.phoneFilterPlaceholder')}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Field label={t('admin.reports.fromLabel')}>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label={t('admin.reports.toLabel')}>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Select
          aria-label={t('admin.reports.typeFilterLabel')}
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
        >
          <option value="">{t('admin.reports.typeAll')}</option>
          <option value="original">{t('admin.reports.typeOriginal')}</option>
          <option value="edited">{t('admin.reports.typeEdited')}</option>
        </Select>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-red-700">
          {error}
        </p>
      )}
      {!loaded && (
        <p role="status" className="mt-4 text-sm text-stone-600">
          {t('admin.common.loading')}
        </p>
      )}
      {loaded && visible.length === 0 && (
        <p className="mt-4 rounded-xl border bg-white p-5 text-sm text-stone-600">
          {reports.length === 0 ? t('admin.reports.empty') : t('admin.reports.noMatches')}
        </p>
      )}
      {visible.length > 0 && (
        <div className="mt-4 hidden overflow-x-auto rounded-xl border bg-white md:block">
          <table className="w-full min-w-[1250px] text-start text-xs [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-3">
            <thead>
              <tr className="border-b text-stone-600">
                <th className="text-start">{t('admin.reports.colReport')}</th>
                <th className="text-start">{t('admin.reports.colClinicLanguage')}</th>
                <th className="text-start">{t('admin.reports.colDateTotals')}</th>
                <th className="text-start">{t('admin.reports.colOriginalEmployee')}</th>
                <th className="text-start">{t('admin.reports.colHistoricalPhone')}</th>
                <th className="text-start">{t('admin.reports.colCurrentOwner')}</th>
                <th className="text-start">{t('admin.reports.colPdf')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const emp = employeesById.get(r.created_by_employee_id)
                const channel = r.communication_channel_id ? channelsById.get(r.communication_channel_id) : undefined
                return (
                  <tr key={r.id} className="border-b align-top">
                    <td className="[overflow-wrap:anywhere]">
                      <b>{r.patient_name}</b>
                      <br />
                      {r.patient_phone}
                      <br />
                      <span className="text-stone-600">{r.id}</span>
                      {r.parent_report_id && (
                        <>
                          <br />
                          {editedFrom(r)}
                        </>
                      )}
                    </td>
                    <td>
                      {t(`admin.clinic.${r.clinic_id}`)}
                      <br />
                      <span className="uppercase">{r.document_locale}</span>
                    </td>
                    <td>
                      {when(r.finalized_at)}
                      <br />
                      <span className="tabular-nums">{total(r)}</span>
                    </td>
                    <td>
                      {r.employee_name_snapshot}
                      <br />
                      <span className="text-stone-600">
                        {emp ? t(`admin.status.${emp.status}`) : t('admin.common.historical')}
                      </span>
                    </td>
                    <td>{r.employee_phone_snapshot}</td>
                    <td>{channel?.current_assignment?.profile?.full_name ?? t('admin.common.unassigned')}</td>
                    <td>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          aria-label={t('admin.reports.downloadNamed', { name: r.patient_name })}
                          title={t('admin.reports.download')}
                          disabled={Boolean(downloading)}
                          aria-busy={downloading === r.id}
                          onClick={() => void save(r)}
                        >
                          {downloading === r.id ? (
                            <LoaderCircle size={15} className="animate-spin motion-reduce:animate-none" />
                          ) : (
                            <Download size={15} />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          aria-label={t('admin.reports.duplicateNamed', { name: r.patient_name })}
                          title={t('admin.reports.duplicate')}
                          onClick={() => duplicate(r)}
                        >
                          <Copy size={15} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 md:hidden">
        <Accordion>
          {visible.map((r) => {
            const emp = employeesById.get(r.created_by_employee_id)
            const channel = r.communication_channel_id ? channelsById.get(r.communication_channel_id) : undefined
            return (
              <AccordionItem
                key={r.id}
                summary={
                  <>
                    <span className="font-semibold [overflow-wrap:anywhere]">{r.patient_name}</span>
                    <span className="ms-2 text-xs text-stone-600">{day(r.finalized_at)}</span>
                    {r.parent_report_id && (
                      <span className="ms-2 rounded-full border border-stone-300 bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700">
                        {t('admin.reports.editedBadge')}
                      </span>
                    )}
                  </>
                }
              >
                <AccordionField label={t('admin.reports.colReport')}>
                  <span className="[overflow-wrap:anywhere]">
                    {r.patient_name}
                    <br />
                    {r.patient_phone}
                    <br />
                    <span className="text-stone-600">{r.id}</span>
                  </span>
                  {r.parent_report_id && (
                    <>
                      <br />
                      {editedFrom(r)}
                    </>
                  )}
                </AccordionField>
                <AccordionField label={t('admin.reports.colClinicLanguage')}>
                  {t(`admin.clinic.${r.clinic_id}`)} · <span className="uppercase">{r.document_locale}</span>
                </AccordionField>
                <AccordionField label={t('admin.reports.colDateTotals')}>
                  {when(r.finalized_at)}
                  <br />
                  <span className="tabular-nums">{total(r)}</span>
                </AccordionField>
                <AccordionField label={t('admin.reports.colOriginalEmployee')}>
                  {r.employee_name_snapshot}
                  <br />
                  <span className="text-stone-600">
                    {emp ? t(`admin.status.${emp.status}`) : t('admin.common.historical')}
                  </span>
                </AccordionField>
                <AccordionField label={t('admin.reports.colHistoricalPhone')}>
                  {r.employee_phone_snapshot}
                </AccordionField>
                <AccordionField label={t('admin.reports.colCurrentOwner')}>
                  {channel?.current_assignment?.profile?.full_name ?? t('admin.common.unassigned')}
                </AccordionField>
                <AccordionField label={t('admin.reports.colPdf')}>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      disabled={Boolean(downloading)}
                      aria-busy={downloading === r.id}
                      onClick={() => void save(r)}
                    >
                      <Download size={15} />
                      {t('admin.reports.download')}
                    </Button>
                    <Button className="flex-1" onClick={() => duplicate(r)}>
                      <Copy size={15} />
                      {t('admin.reports.duplicate')}
                    </Button>
                  </div>
                </AccordionField>
              </AccordionItem>
            )
          })}
        </Accordion>
      </div>
    </main>
  )
}
