import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReportData } from '../domain/report'
import { draftReportSchema } from '../domain/report'
import { generateReport } from '../pdf/generateReport'

export function usePdfPreview(report: ReportData, delay = 250) {
  const [url, setUrl] = useState<string>()
  const [bytes, setBytes] = useState<Uint8Array>()
  const [blob, setBlob] = useState<Blob>()
  const [isGenerating, setIsGenerating] = useState(true)
  const [error, setError] = useState<Error>()
  const [usedFallback, setUsedFallback] = useState(false)
  const generation = useRef(0)
  const reportSnapshot = JSON.stringify(report)

  const run = useCallback(async () => {
    const current = ++generation.current
    setIsGenerating(true)
    setError(undefined)
    try {
      const parsed = draftReportSchema.safeParse(JSON.parse(reportSnapshot) as ReportData)
      if (!parsed.success) return
      const result = await generateReport(parsed.data)
      if (current !== generation.current) return
      const nextBytes = new Uint8Array(result.bytes)
      const nextBlob = new Blob([nextBytes], { type: 'application/pdf' })
      const nextUrl = URL.createObjectURL(nextBlob)
      setBytes(nextBytes)
      setBlob(nextBlob)
      setUsedFallback(result.usedFallback)
      setUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous)
        return nextUrl
      })
    } catch (caught) {
      if (current === generation.current) setError(caught instanceof Error ? caught : new Error(String(caught)))
    } finally {
      if (current === generation.current) setIsGenerating(false)
    }
  }, [reportSnapshot])

  useEffect(() => {
    // Invalidate an in-flight generation as soon as form data changes. Without
    // this, the previous PDF remains downloadable during the debounce window.
    generation.current += 1
    setIsGenerating(true)
    setError(undefined)
    // Trailing-only: regenerate once, `delay` after the last change in a burst. A leading call was
    // tried here before, but for a heavy document (e.g. a 5-page Arabic report, where every dynamic
    // field is rendered through synchronous canvas shaping) it fired a full, main-thread-blocking
    // regeneration on every single keystroke/field-fill in addition to the trailing one, which could
    // starve the UI thread long enough to fail input-driven interactions. One deferred regeneration
    // per burst is what "the preview updates shortly after you stop typing" actually requires.
    const timeout = window.setTimeout(() => { void run() }, delay)
    return () => window.clearTimeout(timeout)
  }, [delay, run])

  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  return { url, bytes, blob, isGenerating, error, usedFallback, regenerate: run }
}
