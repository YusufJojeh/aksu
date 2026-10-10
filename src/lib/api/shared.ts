import { AppError, errorFromBody, type AppErrorCode } from '../appError'
import { normalizePhone } from '../phone'
import type { ArchivedDocumentKind } from '../pdfIntegrity'
import { requireSupabase } from '../supabase'

export { fromRow, toJson } from '../rows'

export const E164_HINT = 'Use E.164 format, for example +905551112233.'

/** Normalizes a phone number to E.164 or throws the shared validation message. */
export function requireE164(phone: string): string {
  const normalized = normalizePhone(phone)
  if (!normalized) throw new AppError('invalid_phone', E164_HINT)
  return normalized
}

/** Optional phone field: blank clears it (null), anything else must be valid E.164. */
export function optionalE164(phone: string | undefined): string | null {
  return phone?.trim() ? requireE164(phone) : null
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** POSTs JSON to one of our serverless endpoints with the current session's bearer token. */
export async function authedPost<T = unknown>(path: string, body: Record<string, unknown>, fallbackCode: AppErrorCode, fallbackError: string): Promise<T> {
  const { data: sessionData } = await requireSupabase().auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new AppError('session_expired', 'Not authenticated')
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string }
  if (!response.ok) throw errorFromBody(payload, fallbackCode, fallbackError)
  return payload
}

/**
 * Has the server re-hash an object the caller just uploaded and record that hash; finalize_report()
 * and the employee_documents insert policy only accept recorded hashes. Pass `documentKind` for a
 * warranty/invitation, omit it for a treatment report.
 */
export async function verifyUploadedPdf(storageKey: string, documentKind?: ArchivedDocumentKind): Promise<string> {
  const payload = await authedPost<{ sha256: string }>('/api/reports/verify-pdf', { storageKey, documentKind }, 'verify_failed', 'Failed to verify archived PDF')
  return payload.sha256
}
