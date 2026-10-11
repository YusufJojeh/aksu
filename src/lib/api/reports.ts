import type { EmployeeProfile } from '../../auth/types'
import type { ReportData } from '../../domain/report'
import { visitTotalMinor } from '../../domain/calculations'
import { normalizePhone } from '../phone'
import { requireSupabase } from '../supabase'
import { assertArchivedPdf } from '../pdfIntegrity'
import { AppError, errorFromBody, toAppErrorCode } from '../appError'
import { bytesToBase64, fromRow, sha256Hex, toJson, verifyUploadedPdf } from './shared'

export interface ArchivedReport {
  id: string
  created_by_employee_id: string
  clinic_id: string
  document_locale: string
  currency: string
  patient_name: string
  patient_phone: string
  patient_identifier?: string
  report_payload: ReportData
  first_visit_total_minor: number
  second_visit_total_minor: number
  employee_name_snapshot: string
  employee_phone_snapshot: string
  communication_channel_id?: string
  template_version: string
  finalized_at: string
  pdf_storage_key: string
  pdf_sha256: string
  parent_report_id?: string
}

export interface ReportEvent {
  id: string
  report_id: string
  actor_id: string
  event_type: 'finalized' | 'downloaded' | 'admin_downloaded' | 'duplicated'
  created_at: string
}

export type ReviewDecision = 'approved' | 'rejected'
export type ReviewState = 'pending_review' | ReviewDecision

/** One manager decision on one finalized report (append-only, at most one per report). */
export interface ReportReview {
  id: string
  report_id: string
  report_pdf_sha256: string
  reviewer_id: string
  previous_state: 'pending_review'
  decision: ReviewDecision
  note: string | null
  created_at: string
}

/** Rejections must explain what to fix; the database enforces the same bounds. */
export const REVIEW_NOTE_MIN = 10
export const REVIEW_NOTE_MAX = 2000

export interface SalesIdentity {
  fullName: string
  phone: string
}

export async function finalizeReport(
  report: ReportData,
  bytes: Uint8Array,
  profile: EmployeeProfile,
  parentReportId?: string,
): Promise<ArchivedReport> {
  await assertArchivedPdf(bytes)
  const client = requireSupabase()
  const id = crypto.randomUUID()
  const storageKey = `${profile.id}/${id}.pdf`
  const blob = new Blob([Uint8Array.from(bytes)], { type: 'application/pdf' })
  const upload = await client.storage
    .from('report-pdfs')
    .upload(storageKey, blob, { contentType: 'application/pdf', upsert: false })
  if (upload.error) throw upload.error
  let hash: string
  try {
    hash = await verifyUploadedPdf(storageKey)
  } catch (error) {
    await client.storage.from('report-pdfs').remove([storageKey])
    throw error
  }
  const patientIdentifier = report.clinicId === 'mb-dental' ? report.patient.patientId : ''
  const patientPhone = normalizePhone(report.patient.phone) ?? report.patient.phone.trim()
  const args = {
    p_clinic_id: report.clinicId,
    p_document_locale: report.document.locale,
    p_currency: report.document.currency,
    p_patient_name: report.patient.name,
    p_patient_phone: patientPhone,
    p_patient_identifier: patientIdentifier,
    p_report_payload: toJson(report),
    p_first_visit_total_minor: visitTotalMinor(report.firstVisit.treatmentRows),
    p_second_visit_total_minor: visitTotalMinor(report.secondVisit.treatmentRows),
    p_template_version: `${report.clinicId}:${report.document.locale}:2026-09`,
    p_pdf_storage_key: storageKey,
    p_pdf_sha256: hash,
    p_parent_report_id: parentReportId,
  }
  const result = await client.rpc('finalize_report', args)
  if (result.error) {
    await client.storage.from('report-pdfs').remove([storageKey])
    throw result.error
  }
  return fromRow<ArchivedReport>(result.data)
}

/**
 * Fetches the exact archived PDF for viewing: RLS is rechecked, and the bytes must be a complete report
 * whose SHA-256 matches the one recorded at finalization. Nothing is regenerated and no download is logged.
 */
export async function loadArchivedReportPdf(report: ArchivedReport): Promise<Blob> {
  const client = requireSupabase()
  // Recheck RLS before using saved data, including after an account is suspended.
  const fresh = await client.from('reports').select('*').eq('id', report.id).single()
  if (fresh.error || !fresh.data)
    throw new AppError(
      'report_unavailable',
      'This report is unavailable or you no longer have permission to download it.',
    )
  const archived = fromRow<ArchivedReport>(fresh.data)
  const result = await client.storage.from('report-pdfs').download(archived.pdf_storage_key)
  const blob = result.data
  if (result.error) {
    const code = 'statusCode' in result.error ? String(result.error.statusCode) : ''
    if (code !== '404' && !/^object not found$/i.test(result.error.message)) throw new Error(result.error.message)
    throw new AppError(
      'report_pdf_missing',
      'The original finalized PDF is missing from storage. No replacement PDF has been generated.',
    )
  }
  if (!blob) throw new AppError('archive_empty', 'The archive did not return a PDF. Please try again.')
  const bytes = new Uint8Array(await blob.arrayBuffer())
  try {
    await assertArchivedPdf(bytes)
  } catch {
    throw new AppError(
      'report_pdf_damaged',
      'This archive contains an incomplete or damaged PDF, not a finalized treatment report. The file cannot be downloaded.',
    )
  }
  if ((await sha256Hex(bytes)) !== archived.pdf_sha256.toLowerCase()) {
    throw new AppError(
      'report_checksum_mismatch',
      'The archived PDF does not match the saved original checksum. Download stopped to protect report integrity.',
    )
  }
  return blob
}

export async function downloadArchivedReport(report: ArchivedReport): Promise<Blob> {
  const blob = await loadArchivedReportPdf(report)
  const event = await requireSupabase().rpc('log_report_download', { p_report_id: report.id })
  if (event.error) throw new Error(event.error.message)
  return blob
}

export async function finalizePublicReport(
  report: ReportData,
  bytes: Uint8Array,
  identity: SalesIdentity,
  parentReportId?: string,
): Promise<ArchivedReport> {
  await assertArchivedPdf(bytes)
  const pdfBase64 = bytesToBase64(bytes)
  const response = await fetch('/api/reports/finalize-public', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      report,
      pdfBase64,
      salesName: identity.fullName,
      salesPhone: identity.phone,
      parentReportId: parentReportId ?? null,
    }),
  })
  const payload = (await response.json().catch(() => ({}))) as {
    report?: ArchivedReport
    error?: string
    code?: string
  }
  if (!response.ok || !payload.report) throw errorFromBody(payload, 'finalize_failed', 'Failed to finalize report.')
  return payload.report
}

export async function listReports(): Promise<ArchivedReport[]> {
  const { data, error } = await requireSupabase()
    .from('reports')
    .select('*')
    .order('finalized_at', { ascending: false })
  if (error) throw error
  return data.map(fromRow<ArchivedReport>)
}

export async function listReportEvents(): Promise<ReportEvent[]> {
  const { data, error } = await requireSupabase()
    .from('report_events')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(fromRow<ReportEvent>)
}

export async function listReportReviews(): Promise<ReportReview[]> {
  const { data, error } = await requireSupabase()
    .from('report_reviews')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(fromRow<ReportReview>)
}

/** Records the one decision on a report. The server takes the reviewer from the session, never from here. */
export async function reviewReport(reportId: string, decision: ReviewDecision, note?: string): Promise<ReportReview> {
  const trimmed = note?.trim() ?? ''
  if (decision === 'rejected' && trimmed.length < REVIEW_NOTE_MIN)
    throw new AppError('review_note_required', 'Explain what must be corrected (at least 10 characters).')
  const { data, error } = await requireSupabase().rpc('review_report', {
    p_report_id: reportId,
    p_decision: decision,
    p_note: trimmed || undefined,
  })
  if (error) throw new AppError(toAppErrorCode(error.message) ?? 'review_failed', error.message)
  return fromRow<ReportReview>(data)
}
