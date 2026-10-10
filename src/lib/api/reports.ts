import type { EmployeeProfile } from '../../auth/types'
import type { ReportData } from '../../domain/report'
import { visitTotalMinor } from '../../domain/calculations'
import { normalizePhone } from '../phone'
import { requireSupabase } from '../supabase'
import { assertArchivedPdf } from '../pdfIntegrity'
import { authedPost, bytesToBase64, sha256Hex } from './shared'

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

export interface ReportEvent { id: string; report_id: string; actor_id: string; event_type: 'finalized' | 'downloaded' | 'admin_downloaded' | 'duplicated'; created_at: string }

export interface SalesIdentity { fullName: string; phone: string }

/** The server re-hashes the uploaded object; finalize_report only accepts a hash it recorded. */
async function verifyUploadedPdfHash(storageKey: string): Promise<string> {
  const payload = await authedPost<{ sha256: string }>('/api/reports/verify-pdf', { storageKey }, 'Failed to verify archived PDF')
  return payload.sha256
}

export async function finalizeReport(report: ReportData, bytes: Uint8Array, profile: EmployeeProfile, parentReportId?: string): Promise<ArchivedReport> {
  await assertArchivedPdf(bytes)
  const client = requireSupabase()
  const id = crypto.randomUUID()
  const storageKey = `${profile.id}/${id}.pdf`
  const blob = new Blob([Uint8Array.from(bytes)], { type: 'application/pdf' })
  const upload = await client.storage.from('report-pdfs').upload(storageKey, blob, { contentType: 'application/pdf', upsert: false })
  if (upload.error) throw upload.error
  let hash: string
  try {
    hash = await verifyUploadedPdfHash(storageKey)
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
    p_report_payload: report,
    p_first_visit_total_minor: visitTotalMinor(report.firstVisit.treatmentRows),
    p_second_visit_total_minor: visitTotalMinor(report.secondVisit.treatmentRows),
    p_template_version: `${report.clinicId}:${report.document.locale}:2026-09`,
    p_pdf_storage_key: storageKey,
    p_pdf_sha256: hash,
    p_parent_report_id: parentReportId ?? null,
  }
  const result = await client.rpc('finalize_report', args)
  if (result.error) {
    await client.storage.from('report-pdfs').remove([storageKey])
    throw result.error
  }
  return result.data as ArchivedReport
}

export async function downloadArchivedReport(report: ArchivedReport): Promise<Blob> {
  const client = requireSupabase()
  // Recheck RLS before using saved data, including after an account is suspended.
  const fresh = await client.from('reports').select('*').eq('id', report.id).single()
  if (fresh.error || !fresh.data) throw new Error('This report is unavailable or you no longer have permission to download it.')
  const archived = fresh.data as ArchivedReport
  const result = await client.storage.from('report-pdfs').download(archived.pdf_storage_key)
  const blob = result.data
  if (result.error) {
    const code = 'statusCode' in result.error ? String(result.error.statusCode) : ''
    if (code !== '404' && !/^object not found$/i.test(result.error.message)) throw new Error(result.error.message)
    throw new Error('The original finalized PDF is missing from storage. No replacement PDF has been generated.')
  }
  if (!blob) throw new Error('The archive did not return a PDF. Please try again.')
  const bytes = new Uint8Array(await blob.arrayBuffer())
  try {
    await assertArchivedPdf(bytes)
  } catch {
    throw new Error('This archive contains an incomplete or damaged PDF, not a finalized treatment report. The file cannot be downloaded.')
  }
  if (await sha256Hex(bytes) !== archived.pdf_sha256.toLowerCase()) {
    throw new Error('The archived PDF does not match the saved original checksum. Download stopped to protect report integrity.')
  }
  const event = await client.rpc('log_report_download', { p_report_id: archived.id })
  if (event.error) throw new Error(event.error.message)
  return blob
}

export async function finalizePublicReport(report: ReportData, bytes: Uint8Array, identity: SalesIdentity, parentReportId?: string): Promise<ArchivedReport> {
  await assertArchivedPdf(bytes)
  const pdfBase64 = bytesToBase64(bytes)
  const response = await fetch('/api/reports/finalize-public', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ report, pdfBase64, salesName: identity.fullName, salesPhone: identity.phone, parentReportId: parentReportId ?? null }),
  })
  const payload = await response.json().catch(() => ({})) as { report?: ArchivedReport; error?: string }
  if (!response.ok || !payload.report) throw new Error(payload.error ?? 'Failed to finalize report.')
  return payload.report
}

export async function listReports(): Promise<ArchivedReport[]> {
  const { data, error } = await requireSupabase().from('reports').select('*').order('finalized_at', { ascending: false })
  if (error) throw error
  return data as ArchivedReport[]
}

export async function listReportEvents(): Promise<ReportEvent[]> {
  const { data, error } = await requireSupabase().from('report_events').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data as ReportEvent[]
}
