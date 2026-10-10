import { Download, FilePlus2, LoaderCircle, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Locale } from '../../domain/report'
import { saveBlob } from '../../lib/download'
import { localeTags } from '../../lib/locale'
import { sanitizeFilenamePart } from '../../lib/filename'
import { downloadArchivedDocument, listDocuments, type ArchivedDocument } from '../../lib/operations'
import { Button, Input, Select } from '../ui'
import { errorText } from '../../i18n/errorText'

export function MyDocuments({ onCreate }: { onCreate?: () => void }) {
  const { t, i18n } = useTranslation()
  const [documents, setDocuments] = useState<ArchivedDocument[]>([])
  const [error, setError] = useState<string>()
  const [downloading, setDownloading] = useState<string>()
  const [kind, setKind] = useState<'' | ArchivedDocument['kind']>('')
  const [query, setQuery] = useState('')

  const [loaded, setLoaded] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const load = useCallback(async () => {
    setLoadFailed(false)
    try {
      setDocuments(await listDocuments())
    } catch {
      setLoadFailed(true)
    } finally {
      setLoaded(true)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])
  const tag = localeTags[(i18n.language in localeTags ? i18n.language : 'en') as Locale]

  const visible = useMemo(
    () =>
      documents.filter(
        (document) =>
          (!kind || document.kind === kind) &&
          (!query.trim() || document.patient_name.toLowerCase().includes(query.trim().toLowerCase())),
      ),
    [documents, kind, query],
  )

  const download = async (document: ArchivedDocument) => {
    setError(undefined)
    setDownloading(document.id)
    try {
      const name = sanitizeFilenamePart(document.patient_name) || 'Patient'
      saveBlob(
        await downloadArchivedDocument(document),
        `MB_${document.kind}_${name}_${document.created_at.slice(0, 10)}.pdf`,
      )
    } catch (caught) {
      setError(errorText(caught, t, 'sales.errors.downloadFailed'))
    } finally {
      setDownloading(undefined)
    }
  }

  return (
    <>
      {error && (
        <p role="alert" className="mt-3 text-red-700">
          {error}
        </p>
      )}
      {loadFailed && (
        <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 text-red-700">
          <p>{t('sales.errors.loadDocuments')}</p>
          <Button onClick={() => void load()}>
            <RotateCcw size={16} />
            {t('actions.retry')}
          </Button>
        </div>
      )}
      {!loaded && (
        <p role="status" className="mt-4 text-sm text-stone-600">
          {t('sales.documents.loading')}
        </p>
      )}
      <div className="mt-4 grid gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-2">
        <Input
          aria-label={t('sales.documents.search')}
          placeholder={t('sales.documents.search')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select
          aria-label={t('sales.reports.filterKind')}
          value={kind}
          onChange={(event) => setKind(event.target.value as typeof kind)}
        >
          <option value="">{t('sales.documents.all')}</option>
          <option value="warranty">{t('sales.documents.warranty')}</option>
          <option value="invitation">{t('sales.documents.invitation')}</option>
        </Select>
      </div>
      <ul className="mt-4 space-y-3">
        {visible.map((document) => (
          <li
            key={document.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4"
          >
            <div className="min-w-0">
              <p className="font-semibold [overflow-wrap:anywhere]">
                {document.patient_name || t('sales.documents.noName')}
              </p>
              <p className="mt-1 text-xs text-stone-600">
                {t(`sales.documents.${document.kind}`)} ·{' '}
                {new Date(document.created_at).toLocaleString(tag, { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
            <Button
              size="icon"
              aria-label={t('sales.documents.download', { name: document.patient_name || t('sales.documents.noName') })}
              disabled={Boolean(downloading)}
              aria-busy={downloading === document.id}
              onClick={() => void download(document)}
            >
              {downloading === document.id ? (
                <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" />
              ) : (
                <Download size={16} />
              )}
            </Button>
          </li>
        ))}
      </ul>
      {loaded &&
        !loadFailed &&
        visible.length === 0 &&
        (documents.length === 0 ? (
          <div className="mt-4 rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
            <p className="font-semibold text-ink">{t('sales.documents.empty')}</p>
            <p className="mt-1">{t('sales.documents.emptyHint')}</p>
            {onCreate && (
              <Button variant="primary" className="mt-3" onClick={onCreate}>
                <FilePlus2 size={16} />
                {t('sales.nav.create')}
              </Button>
            )}
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
            {t('sales.documents.noMatches')}
          </p>
        ))}
    </>
  )
}
