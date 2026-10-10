import { Download, FilePlus2, History, LoaderCircle, PencilLine, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { clinicRegistry } from '../../clinics/registry'
import type { ClinicId } from '../../clinics/types'
import type { Currency, Locale } from '../../domain/report'
import { formatMoneyMinor, localeTags } from '../../lib/locale'
import { downloadArchivedReport, listReportEvents, listReports, type ArchivedReport, type ReportEvent } from '../../lib/operations'
import { archivedReportFilename } from '../../lib/filename'
import { saveBlob } from '../../lib/download'
import { buildReportHistory, downloadCounts, filterReports, isEditedCopy, type ReportKindFilter } from '../../lib/reportHistory'
import { Button, Input, Select, Tabs, TabsList, TabsTrigger } from '../ui'
import { MyDocuments } from './MyDocuments'

// Finalized reports are immutable: editing opens the form pre-filled and saves a new copy linked
// to the original (parent_report_id), so both versions and the edit date stay on record.
function edit(report: ArchivedReport) {
  sessionStorage.setItem('duplicateReport', JSON.stringify({ payload: report.report_payload, parentReportId: report.id }))
  window.location.href = '/'
}

const uiLocale = (language: string): Locale => (language in localeTags ? language : 'en') as Locale
const clinicName = (id: string) => clinicRegistry[id as ClinicId]?.displayName ?? id

function ReportsList({ onCreate }: { onCreate?: () => void }) {
  const { t, i18n } = useTranslation()
  const [reports, setReports] = useState<ArchivedReport[]>([])
  const [events, setEvents] = useState<ReportEvent[]>([])
  const [error, setError] = useState<string>()
  const [downloading, setDownloading] = useState<string>()
  const [kind, setKind] = useState<ReportKindFilter>('all')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string>()
  const [loaded, setLoaded] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  const load = useCallback(async () => {
    setLoadFailed(false); setError(undefined)
    try {
      const [loadedReports, loadedEvents] = await Promise.all([listReports(), listReportEvents()])
      setReports(loadedReports); setEvents(loadedEvents)
    } catch { setLoadFailed(true) }
    finally { setLoaded(true) }
  }, [])
  useEffect(() => { void load() }, [load])

  const download = async (report: ArchivedReport) => {
    setError(undefined); setDownloading(report.id)
    try {
      saveBlob(await downloadArchivedReport(report), archivedReportFilename(report))
      const refreshed = await listReportEvents().catch(() => undefined)
      if (refreshed) setEvents(refreshed)
    } catch (caught) { setError(caught instanceof Error ? caught.message : t('sales.errors.downloadFailed')) }
    finally { setDownloading(undefined) }
  }

  const visible = useMemo(() => filterReports(reports, { kind, query }), [reports, kind, query])
  const downloads = useMemo(() => downloadCounts(events), [events])
  const history = useMemo(() => openId ? buildReportHistory(reports, events, openId) : undefined, [reports, events, openId])
  const byId = useMemo(() => new Map(reports.map((report) => [report.id, report])), [reports])
  const locale = uiLocale(i18n.language)
  const when = (value: string) => new Date(value).toLocaleString(localeTags[locale], { dateStyle: 'medium', timeStyle: 'short' })
  const total = (report: ArchivedReport) => formatMoneyMinor(report.first_visit_total_minor + report.second_visit_total_minor, report.currency as Currency, locale)

  return <>
    {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
    {loadFailed && <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 text-red-700"><p>{t('sales.errors.loadReports')}</p><Button onClick={() => void load()}><RotateCcw size={16} />{t('actions.retry')}</Button></div>}
    {!loaded && <p role="status" className="mt-4 text-sm text-stone-600">{t('sales.reports.loading')}</p>}
    <div className="mt-4 grid gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-2">
      <Input aria-label={t('sales.reports.search')} placeholder={t('sales.reports.search')} value={query} onChange={(event) => setQuery(event.target.value)} />
      <Select aria-label={t('sales.reports.filterKind')} value={kind} onChange={(event) => setKind(event.target.value as ReportKindFilter)}>
        <option value="all">{t('sales.reports.kindAll')}</option>
        <option value="original">{t('sales.reports.kindOriginal')}</option>
        <option value="edited">{t('sales.reports.kindEdited')}</option>
      </Select>
    </div>
    <ul className="mt-4 space-y-3">{visible.map((report) => {
      const open = openId === report.id
      const parent = report.parent_report_id ? byId.get(report.parent_report_id) : undefined
      return <li key={report.id} className="rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold [overflow-wrap:anywhere]">{report.patient_name}
              {isEditedCopy(report) && <span className="ms-2 rounded-full border border-stone-300 bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700">{t('sales.reports.editedCopy')}</span>}
            </p>
            <p className="mt-1 text-xs text-stone-600">
              {when(report.finalized_at)} · {clinicName(report.clinic_id)} · <span className="uppercase">{report.document_locale}</span> · <span className="tabular-nums">{total(report)}</span> · {t('sales.reports.downloads', { count: downloads.get(report.id) ?? 0 })}
            </p>
            {parent && <p className="mt-1 text-xs text-stone-600">{t('sales.reports.editedFrom', { date: when(parent.finalized_at) })}</p>}
          </div>
          <div className="flex gap-1">
            <Button size="icon" aria-label={t('sales.reports.editNamed', { name: report.patient_name })} title={t('sales.reports.editTitle')} onClick={() => edit(report)}><PencilLine size={16} /></Button>
            <Button size="icon" aria-label={t('sales.reports.downloadNamed', { name: report.patient_name })} disabled={Boolean(downloading)} aria-busy={downloading === report.id} onClick={() => void download(report)}>{downloading === report.id ? <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" /> : <Download size={16} />}</Button>
            <Button aria-expanded={open} onClick={() => setOpenId(open ? undefined : report.id)}><History size={16} />{open ? t('sales.reports.hideHistory') : t('sales.reports.history')}</Button>
          </div>
        </div>
        {open && history && <div className="mt-4 grid gap-4 border-t border-stone-200 pt-4 md:grid-cols-2">
          <section aria-label={t('sales.reports.versions')}>
            <h2 className="text-sm font-bold">{t('sales.reports.versions')}</h2>
            <ol className="mt-2 space-y-2">{history.versions.map((version) => <li key={version.id} className="flex items-center justify-between gap-2 rounded-lg bg-stone-50 p-2 text-xs">
              <span>{version.id === report.id && <b>{t('sales.reports.current')} · </b>}{when(version.finalized_at)} · <span className="tabular-nums">{total(version)}</span></span>
              <Button size="icon" aria-label={`${t('sales.reports.download')} ${when(version.finalized_at)}`} disabled={Boolean(downloading)} onClick={() => void download(version)}><Download size={14} /></Button>
            </li>)}</ol>
          </section>
          <section aria-label={t('sales.reports.log')}>
            <h2 className="text-sm font-bold">{t('sales.reports.log')}</h2>
            <ol className="mt-2 space-y-1 text-xs">{history.log.map((entry) => <li key={entry.id}>
              <span className="text-stone-600">{when(entry.at)}</span> — {t(entry.type === 'created' ? 'sales.reports.logCreated' : entry.type === 'edited' ? 'sales.reports.logEdited' : 'sales.reports.logDownloaded', { name: entry.report.patient_name })}
            </li>)}</ol>
          </section>
        </div>}
      </li>
    })}</ul>
    {loaded && !loadFailed && visible.length === 0 && (reports.length === 0
      ? <div className="mt-4 rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-600"><p className="font-semibold text-ink">{t('sales.reports.empty')}</p><p className="mt-1">{t('sales.reports.emptyHint')}</p>{onCreate && <Button variant="primary" className="mt-3" onClick={onCreate}><FilePlus2 size={16} />{t('sales.nav.create')}</Button>}</div>
      : <p className="mt-4 rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-600">{t('sales.reports.noMatches')}</p>)}
  </>
}

export function MyReports({ onCreate }: { onCreate?: () => void }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'plans' | 'documents'>('plans')
  return <main className="mx-auto max-w-6xl p-4 sm:p-7">
    <h1 className="text-2xl font-bold">{t('sales.reports.title')}</h1>
    <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)} className="mt-4 max-w-xl">
      <TabsList><TabsTrigger value="plans" aria-controls="my-reports-panel">{t('sales.tabs.plans')}</TabsTrigger><TabsTrigger value="documents" aria-controls="my-reports-panel">{t('sales.tabs.documents')}</TabsTrigger></TabsList>
    </Tabs>
    <div id="my-reports-panel">{tab === 'plans' ? <ReportsList onCreate={onCreate} /> : <MyDocuments onCreate={onCreate} />}</div>
  </main>
}
