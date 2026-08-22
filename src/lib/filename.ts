import type { Locale } from '../domain/report'

export function sanitizeFilenamePart(value: string): string {
  // eslint-disable-next-line no-control-regex -- filenames must strip the Windows control-character range
  return value.normalize('NFKD').replace(/[<>:"/\\|?*\u0000-\u001F]/g, '').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 80)
}

export function reportFilename(name: string, date: string, locale: Locale): string {
  const safeName = sanitizeFilenamePart(name) || 'Patient'
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10)
  return `Treatment_Plan_${safeName}_${safeDate}_${locale.toUpperCase()}.pdf`
}
