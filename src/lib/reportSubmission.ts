import type { ClinicId } from '../clinics/types'
import type { Locale } from '../domain/report'

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 8192
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

// Best-effort background log of a generated report for the admin dashboard. Never awaited by
// the caller and never throws: the employee's own download must succeed regardless of whether
// the backend is reachable or configured.
export function submitReport(params: {
  employeeName: string
  clinicId: ClinicId
  locale: Locale
  patientName: string
  bytes: Uint8Array
}): void {
  const { employeeName, clinicId, locale, patientName, bytes } = params
  void fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeName, clinicId, locale, patientName, pdfBase64: bytesToBase64(bytes) }),
  }).catch((error: unknown) => {
    console.warn('Failed to submit report to admin log', error)
  })
}
