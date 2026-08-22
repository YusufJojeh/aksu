import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReportData } from '../domain/report'
import { generateReport } from '../pdf/generateReport'

export function usePdfPreview(report: ReportData, delay = 400) {
  const [url, setUrl] = useState<string>()
  const [bytes, setBytes] = useState<Uint8Array>()
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
      const result = await generateReport(JSON.parse(reportSnapshot) as ReportData)
      if (current !== generation.current) return
      const nextBytes = new Uint8Array(result.bytes)
      const nextUrl = URL.createObjectURL(new Blob([nextBytes], { type: 'application/pdf' }))
      setBytes(nextBytes)
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
    const timeout = window.setTimeout(() => void run(), delay)
    return () => window.clearTimeout(timeout)
  }, [delay, run])

  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  return { url, bytes, isGenerating, error, usedFallback, regenerate: run }
}
