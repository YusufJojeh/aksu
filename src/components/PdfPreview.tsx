import { ChevronLeft, ChevronRight, FileWarning, LoaderCircle } from 'lucide-react'
import * as pdfjs from 'pdfjs-dist'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

export function PdfPreview({ url, loading, error }: { url?: string; loading: boolean; error?: Error }) {
  const { t } = useTranslation()
  const canvas = useRef<HTMLCanvasElement>(null)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(5)

  useEffect(() => {
    if (!url || !canvas.current) return
    let cancelled = false
    let renderTask: pdfjs.RenderTask | undefined
    let documentProxy: pdfjs.PDFDocumentProxy | undefined
    const loadingTask = pdfjs.getDocument({ url })
    const render = async () => {
      try {
        documentProxy = await loadingTask.promise
        if (cancelled) return
        setPages(documentProxy.numPages)
        const selected = await documentProxy.getPage(Math.min(page, documentProxy.numPages))
        const base = selected.getViewport({ scale: 1 })
        const available = Math.min(1.35, ((canvas.current?.parentElement?.clientWidth ?? 600) - 32) / base.width)
        const viewport = selected.getViewport({ scale: Math.max(0.55, available) * window.devicePixelRatio })
        const scratch = document.createElement('canvas')
        scratch.width = viewport.width
        scratch.height = viewport.height
        const scratchContext = scratch.getContext('2d')
        if (!scratchContext || cancelled) return
        renderTask = selected.render({ canvas: scratch, canvasContext: scratchContext, viewport })
        await renderTask.promise
        const element = canvas.current
        if (!element || cancelled) return
        element.width = viewport.width
        element.height = viewport.height
        element.style.width = `${viewport.width / window.devicePixelRatio}px`
        element.style.height = `${viewport.height / window.devicePixelRatio}px`
        element.getContext('2d')?.drawImage(scratch, 0, 0)
      } catch (caught) {
        if (!cancelled && !(caught instanceof Error && caught.name === 'RenderingCancelledException')) throw caught
      }
    }
    void render()
    return () => {
      cancelled = true
      renderTask?.cancel()
      void loadingTask.destroy()
    }
  }, [page, url])

  if (error) return <div className="grid min-h-[420px] place-items-center p-8 text-center text-red-800"><div><FileWarning className="mx-auto mb-3" /><p className="font-semibold">{t('status.error')}</p><p className="mt-1 max-w-md text-xs opacity-80">{error.message}</p></div></div>

  return <div className="relative flex min-h-[420px] flex-col items-center">
    <div className="sticky top-0 z-10 flex w-full items-center justify-center gap-3 border-b border-stone-300/70 bg-stone-200/95 p-2 backdrop-blur">
      <Button aria-label="Previous page" className="size-9 min-h-9 bg-white p-0 text-ink shadow-sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={17} /></Button>
      <span className="min-w-28 text-center text-xs font-semibold text-stone-600">{t('status.page', { current: page, total: pages })}</span>
      <Button aria-label="Next page" className="size-9 min-h-9 bg-white p-0 text-ink shadow-sm" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}><ChevronRight size={17} /></Button>
    </div>
    <div className="w-full overflow-auto p-4 text-center">
      <canvas ref={canvas} className="mx-auto bg-white shadow-paper" aria-label={t('sections.pdfPreview')} />
    </div>
    {loading && <div className="absolute inset-0 z-20 grid place-items-center bg-stone-100/65 backdrop-blur-[1px]"><div className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-ink shadow-lg"><LoaderCircle className="me-2 inline animate-spin" size={17} />{t('status.generating')}</div></div>}
  </div>
}
