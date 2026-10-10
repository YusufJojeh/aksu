import { Download } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { saveBlob } from '../../lib/download'
import { sanitizeFilenamePart } from '../../lib/filename'
import { downloadArchivedDocument, listDocuments, type ArchivedDocument } from '../../lib/operations'
import { Button, Input, Select } from '../ui'

export function MyDocuments() {
  const { t } = useTranslation()
  const [documents, setDocuments] = useState<ArchivedDocument[]>([])
  const [error, setError] = useState<string>()
  const [downloading, setDownloading] = useState<string>()
  const [kind, setKind] = useState<'' | ArchivedDocument['kind']>('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    void listDocuments().then(setDocuments).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : t('sales.errors.loadReports')))
  }, [t])

  const visible = useMemo(() => documents.filter((document) =>
    (!kind || document.kind === kind) && (!query.trim() || document.patient_name.toLowerCase().includes(query.trim().toLowerCase()))), [documents, kind, query])

  const download = async (document: ArchivedDocument) => {
    setError(undefined); setDownloading(document.id)
    try {
      const name = sanitizeFilenamePart(document.patient_name) || 'Patient'
      saveBlob(await downloadArchivedDocument(document), `MB_${document.kind}_${name}_${document.created_at.slice(0, 10)}.pdf`)
    } catch (caught) { setError(caught instanceof Error ? caught.message : t('sales.errors.downloadFailed')) }
    finally { setDownloading(undefined) }
  }

  return <>
    {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
    <div className="mt-4 grid gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-2">
      <Input aria-label={t('sales.reports.search')} placeholder={t('sales.reports.search')} value={query} onChange={(event) => setQuery(event.target.value)} />
      <Select aria-label={t('sales.reports.filterKind')} value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
        <option value="">{t('sales.documents.all')}</option>
        <option value="warranty">{t('sales.documents.warranty')}</option>
        <option value="invitation">{t('sales.documents.invitation')}</option>
      </Select>
    </div>
    <ul className="mt-4 space-y-3">{visible.map((document) => <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4">
      <div className="min-w-0">
        <p className="font-semibold">{document.patient_name || t('sales.documents.noName')}</p>
        <p className="mt-1 text-xs text-stone-500">{t(`sales.documents.${document.kind}`)} · {new Date(document.created_at).toLocaleString()}</p>
      </div>
      <Button size="icon" aria-label={t('sales.documents.download', { name: document.patient_name || t('sales.documents.noName') })} disabled={Boolean(downloading)} aria-busy={downloading === document.id} onClick={() => void download(document)}><Download size={16} /></Button>
    </li>)}</ul>
    {!error && visible.length === 0 && <p className="mt-4 rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-500">{t('sales.documents.empty')}</p>}
  </>
}
