import * as DialogPrimitive from '@radix-ui/react-dialog'
import { FileWarning, LoaderCircle, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { errorText } from '../i18n/errorText'
import { loadArchivedReportPdf, type ArchivedReport } from '../lib/operations'
import { PdfPreview } from './PdfPreview'
import { Button } from './ui'

/**
 * Shows the exact archived PDF of a finalized report inside the app. The bytes come through the same
 * RLS-checked, hash-verified path as a download, are never regenerated, and the blob URL is released on close.
 */
export function ArchivedPdfViewer({
  report,
  onClose,
  children,
}: {
  report: ArchivedReport
  onClose: () => void
  /** Side panel, e.g. the manager's review actions. */
  children?: ReactNode
}) {
  const { t } = useTranslation()
  const [url, setUrl] = useState<string>()
  const [error, setError] = useState<string>()
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | undefined
    setUrl(undefined)
    setError(undefined)
    loadArchivedReportPdf(report)
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(errorText(caught, t, 'admin.reports.viewFailed'))
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [report, attempt]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col bg-stone-100 focus:outline-none sm:inset-4 sm:rounded-xl sm:border sm:border-stone-200 sm:shadow-md">
          <header className="flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3 sm:rounded-t-xl">
            <div className="min-w-0">
              <DialogPrimitive.Title className="truncate text-base font-bold text-ink">
                {t('admin.reports.viewerTitle', { name: report.patient_name })}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-stone-600">
                {t('admin.reports.viewerHint')}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button size="icon" aria-label={t('admin.common.close')}>
                <X size={18} />
              </Button>
            </DialogPrimitive.Close>
          </header>
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <div className="min-h-[50vh] min-w-0 flex-1 overflow-auto lg:min-h-0">
              {error ? (
                <div role="alert" className="grid min-h-[320px] place-items-center p-8 text-center text-red-800">
                  <div className="grid justify-items-center gap-2">
                    <FileWarning />
                    <p className="max-w-md text-sm font-semibold">{error}</p>
                    <Button className="mt-2" onClick={() => setAttempt((value) => value + 1)}>
                      {t('actions.retry')}
                    </Button>
                  </div>
                </div>
              ) : url ? (
                <PdfPreview url={url} loading={false} />
              ) : (
                <p role="status" className="grid min-h-[320px] place-items-center text-sm font-semibold text-stone-600">
                  <span className="inline-flex items-center gap-2">
                    <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" />
                    {t('admin.reports.viewerLoading')}
                  </span>
                </p>
              )}
            </div>
            {children && (
              <aside className="max-h-[45vh] shrink-0 overflow-auto border-t border-stone-200 bg-white p-4 lg:max-h-none lg:w-[360px] lg:border-s lg:border-t-0 sm:rounded-b-xl lg:rounded-be-xl lg:rounded-bl-none">
                {children}
              </aside>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
