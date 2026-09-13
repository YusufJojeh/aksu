import type { EmployeeProfile, EmployeeStatus, UserRole } from '../auth/types'
import type { ReportData } from '../domain/report'
import { visitTotalMinor } from '../domain/calculations'
import { normalizePhone } from './phone'
import { requireSupabase } from './supabase'

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

export interface CommunicationChannel {
  id: string
  phone_e164: string
  type: 'whatsapp' | 'phone'
  label: string
  status: 'active' | 'inactive'
  created_at: string
  current_assignment?: { employee_id: string; assigned_at: string; profile?: { full_name: string } }
}

export interface ReportEvent { id: string; report_id: string; actor_id: string; event_type: 'finalized' | 'downloaded' | 'admin_downloaded' | 'duplicated'; created_at: string }

async function sha256(bytes: Uint8Array): Promise<string> {
  const owned = Uint8Array.from(bytes)
  const digest = await crypto.subtle.digest('SHA-256', owned.buffer)
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('')
}

export async function finalizeReport(report: ReportData, bytes: Uint8Array, profile: EmployeeProfile, parentReportId?: string): Promise<ArchivedReport> {
  const client = requireSupabase()
  const id = crypto.randomUUID()
  const storageKey = `${profile.id}/${id}.pdf`
  const hash = await sha256(bytes)
  const blob = new Blob([Uint8Array.from(bytes)], { type: 'application/pdf' })
  const upload = await client.storage.from('report-pdfs').upload(storageKey, blob, { contentType: 'application/pdf', upsert: false })
  if (upload.error) throw upload.error
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
  const result = await client.storage.from('report-pdfs').download(report.pdf_storage_key)
  if (result.error) throw result.error
  const event = await client.rpc('log_report_download', { p_report_id: report.id })
  if (event.error) throw event.error
  return result.data
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

export async function listEmployees(): Promise<EmployeeProfile[]> {
  const { data, error } = await requireSupabase().from('profiles').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data as EmployeeProfile[]
}

export async function inviteEmployee(input: { fullName: string; email: string; workPhone: string }): Promise<void> {
  const phone = normalizePhone(input.workPhone)
  if (!phone) throw new Error('Use E.164 format, for example +905551112233.')
  const { data: sessionData } = await requireSupabase().auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Not authenticated')
  const response = await fetch('/api/admin/invite-employee', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fullName: input.fullName.trim(), email: input.email.trim().toLowerCase(), workPhoneE164: phone }),
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error ?? 'Failed to invite employee')
  }
}

export async function updateEmployee(id: string, patch: { full_name?: string; role?: UserRole; status?: EmployeeStatus }): Promise<void> {
  const { error } = await requireSupabase().from('profiles').update(patch).eq('id', id)
  if (error) throw error
}

export async function offboardEmployee(id: string, status: 'suspended' | 'former'): Promise<void> {
  const { error } = await requireSupabase().rpc('offboard_employee', { p_employee_id: id, p_status: status })
  if (error) throw error
}

export async function listChannels(): Promise<CommunicationChannel[]> {
  const { data, error } = await requireSupabase().from('communication_channels').select('*, channel_assignments(employee_id, assigned_at, unassigned_at, profiles!channel_assignments_employee_id_fkey(full_name))').order('created_at', { ascending: false })
  if (error) throw error
  return (data as Array<CommunicationChannel & { channel_assignments?: Array<{ employee_id: string; assigned_at: string; unassigned_at?: string; profiles?: { full_name: string } }> }>).map((channel) => ({
    ...channel,
    current_assignment: channel.channel_assignments?.find((assignment) => !assignment.unassigned_at)
      ? { employee_id: channel.channel_assignments.find((assignment) => !assignment.unassigned_at)!.employee_id, assigned_at: channel.channel_assignments.find((assignment) => !assignment.unassigned_at)!.assigned_at, profile: channel.channel_assignments.find((assignment) => !assignment.unassigned_at)!.profiles }
      : undefined,
  }))
}

export async function createChannel(input: { phone: string; type: 'whatsapp' | 'phone'; label: string }): Promise<void> {
  const phone = normalizePhone(input.phone)
  if (!phone) throw new Error('Use E.164 format, for example +905551112233.')
  const { error } = await requireSupabase().from('communication_channels').insert({ phone_e164: phone, type: input.type, label: input.label.trim() })
  if (error) throw error
}

export async function setChannelStatus(id: string, status: 'active' | 'inactive'): Promise<void> {
  const { error } = await requireSupabase().from('communication_channels').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function assignChannel(channelId: string, employeeId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('assign_channel', { p_channel_id: channelId, p_employee_id: employeeId })
  if (error) throw error
}

export async function unassignChannel(channelId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('unassign_channel', { p_channel_id: channelId })
  if (error) throw error
}
