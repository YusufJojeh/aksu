import { FileWarning, LoaderCircle } from 'lucide-react'
import * as pdfjs from 'pdfjs-dist'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

// Layout settles to within a pixel or two of the same width, and a fractional scale turns that
// jitter into canvases that differ in height between renders. Snapping the measured width to the
// same 4px grid the resize observer already ignores keeps one layout at one scale.
const WIDTH_GRID = 4
const quantizeWidth = (width: number) => Math.floor(width / WIDTH_GRID) * WIDTH_GRID

export function PdfPreview({ url, loading, error }: { url?: string; loading: boolean; error?: Error }) {
  const { t } = useTranslation()
  const pagesContainer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!url || !pagesContainer.current) return
    let cancelled = false
    // A resize can start a second pass while the first is still awaiting a page. Without a
    // generation guard the superseded pass keeps appending to the container the newer one just
    // cleared, leaving two documents' worth of canvases stacked in the preview.
    let latestRun = 0
    let renderTasks: pdfjs.RenderTask[] = []
    const clearCanvases = () => {
      if (!pagesContainer.current) return
      pagesContainer.current.replaceChildren()
    }
    const loadingTask = pdfjs.getDocument({ url, disableFontFace: true })
    const renderAll = async () => {
      const run = (latestRun += 1)
      const superseded = () => cancelled || run !== latestRun
      const tasks: pdfjs.RenderTask[] = []
      try {
        const documentProxy = await loadingTask.promise
        if (superseded()) return
        renderTasks.forEach((task) => task.cancel())
        renderTasks = tasks
        clearCanvases()
        for (let pageNumber = 1; pageNumber <= documentProxy.numPages; pageNumber += 1) {
          if (superseded() || !pagesContainer.current) return
          const selected = await documentProxy.getPage(pageNumber)
          if (superseded() || !pagesContainer.current) return
          const base = selected.getViewport({ scale: 1 })
          const available = Math.min(1.35, (quantizeWidth(pagesContainer.current.parentElement?.clientWidth ?? 600) - 32) / base.width)
          // Rounded to a hundredth so a pixel of layout jitter cannot change the canvas size.
          const scale = Math.round(Math.max(0.55, available) * 100) / 100
          const viewport = selected.getViewport({ scale: scale * window.devicePixelRatio })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.width = `${viewport.width / window.devicePixelRatio}px`
          canvas.style.height = `${viewport.height / window.devicePixelRatio}px`
          canvas.className = 'mx-auto bg-white shadow-paper'
          canvas.setAttribute('aria-label', `${t('sections.pdfPreview')} ${pageNumber}`)
          const context = canvas.getContext('2d')
          if (!context) return
          pagesContainer.current.append(canvas)
          const renderTask = selected.render({ canvas, canvasContext: context, viewport })
          tasks.push(renderTask)
          await renderTask.promise
        }
      } catch (caught) {
        if (!cancelled && !(caught instanceof Error && caught.name === 'RenderingCancelledException')) throw caught
      }
    }
    void renderAll()
    // Re-render at the current container width on rotation/resize, and when the
    // mobile Edit/Preview tab toggle (display:none <-> block) reveals this pane
    // with its real width for the first time -- otherwise canvases stay stuck
    // at whatever width was available (possibly 0) when the last render ran.
    let resizeTimeout: number | undefined
    const container = pagesContainer.current.parentElement
    let lastWidth = quantizeWidth(container?.clientWidth ?? 0)
    const observer = container && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
      const nextWidth = quantizeWidth(container.clientWidth)
      if (nextWidth === lastWidth) return
      lastWidth = nextWidth
      window.clearTimeout(resizeTimeout)
      resizeTimeout = window.setTimeout(() => void renderAll(), 150)
    }) : undefined
    if (container) observer?.observe(container)
    return () => {
      cancelled = true
      window.clearTimeout(resizeTimeout)
      observer?.disconnect()
      renderTasks.forEach((task) => task.cancel())
      void loadingTask.destroy()
    }
  }, [t, url])

  if (error) return <div className="grid min-h-[420px] place-items-center p-8 text-center text-red-800"><div><FileWarning className="mx-auto mb-3" /><p className="font-semibold">{t('status.error')}</p><p className="mt-1 max-w-md text-xs opacity-80">{error.message}</p></div></div>

  return <div className="relative flex min-h-[420px] flex-col items-center">
    <div className="sticky top-0 z-10 flex w-full items-center justify-center gap-3 border-b border-stone-300/70 bg-stone-200/95 p-2 backdrop-blur">
      <span className="flex min-w-28 items-center justify-center gap-1.5 text-center text-xs font-semibold text-stone-600">{t('sections.pdfPreview')}{loading && url && <LoaderCircle aria-hidden size={12} className="animate-spin text-gold" />}</span>
    </div>
    {/* The gutter is reserved so the scrollbar appearing partway through the first render cannot
        narrow the container and make the remaining pages render at a slightly different scale. */}
    <div className="w-full overflow-auto p-4 text-center [scrollbar-gutter:stable]">
      <div ref={pagesContainer} className="mx-auto flex w-fit flex-col gap-5" aria-label={t('sections.pdfPreview')} />
    </div>
    {loading && !url && <div className="absolute inset-0 z-20 grid place-items-center bg-stone-100/65 backdrop-blur-[1px]"><div className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-ink shadow-lg"><LoaderCircle className="me-2 inline animate-spin" size={17} />{t('status.generating')}</div></div>}
  </div>
}
