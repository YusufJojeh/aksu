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

export interface Customer {
  id: string
  clinic_id: string
  full_name: string
  phone_e164: string | null
  patient_identifier: string | null
  notes: string | null
  status: 'active' | 'archived'
  created_by_employee_id: string
  created_at: string
  updated_at: string
}

async function callAdminEndpoint(path: string, body: Record<string, unknown>): Promise<void> {
  const { data: sessionData } = await requireSupabase().auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Not authenticated')
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error ?? 'Request failed')
  }
}

async function verifyUploadedPdfHash(storageKey: string): Promise<string> {
  const { data: sessionData } = await requireSupabase().auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Not authenticated')
  const response = await fetch('/api/reports/verify-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ storageKey }),
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error ?? 'Failed to verify archived PDF')
  }
  const payload = (await response.json()) as { sha256: string }
  return payload.sha256
}

export async function finalizeReport(report: ReportData, bytes: Uint8Array, profile: EmployeeProfile, parentReportId?: string): Promise<ArchivedReport> {
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
  await callAdminEndpoint('/api/admin/invite-employee', { fullName: input.fullName.trim(), email: input.email.trim().toLowerCase(), workPhoneE164: phone })
}

export async function deleteEmployee(id: string): Promise<void> {
  await callAdminEndpoint('/api/admin/delete-employee', { employeeId: id })
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

export async function updateChannel(id: string, patch: { phone?: string; label?: string; type?: 'whatsapp' | 'phone' }): Promise<void> {
  const update: { phone_e164?: string; label?: string; type?: 'whatsapp' | 'phone'; updated_at: string } = { updated_at: new Date().toISOString() }
  if (patch.phone !== undefined) {
    const phone = normalizePhone(patch.phone)
    if (!phone) throw new Error('Use E.164 format, for example +905551112233.')
    update.phone_e164 = phone
  }
  if (patch.label !== undefined) update.label = patch.label.trim()
  if (patch.type !== undefined) update.type = patch.type
  const { error } = await requireSupabase().from('communication_channels').update(update).eq('id', id)
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

export async function listCustomers(): Promise<Customer[]> {
  const { data, error } = await requireSupabase().from('customers').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data as Customer[]
}

export async function createCustomer(input: { clinicId: string; fullName: string; phone?: string; patientIdentifier?: string; notes?: string }): Promise<void> {
  const phone = input.phone?.trim() ? normalizePhone(input.phone) : null
  if (input.phone?.trim() && !phone) throw new Error('Use E.164 format, for example +905551112233.')
  const { error } = await requireSupabase().from('customers').insert({
    clinic_id: input.clinicId,
    full_name: input.fullName.trim(),
    phone_e164: phone,
    patient_identifier: input.patientIdentifier?.trim() || null,
    notes: input.notes?.trim() || null,
  })
  if (error) throw error
}

export async function updateCustomer(id: string, patch: { fullName?: string; phone?: string; patientIdentifier?: string; notes?: string; status?: 'active' | 'archived' }): Promise<void> {
  const update: { full_name?: string; phone_e164?: string | null; patient_identifier?: string | null; notes?: string | null; status?: 'active' | 'archived' } = {}
  if (patch.fullName !== undefined) update.full_name = patch.fullName.trim()
  if (patch.phone !== undefined) {
    if (!patch.phone.trim()) { update.phone_e164 = null }
    else {
      const phone = normalizePhone(patch.phone)
      if (!phone) throw new Error('Use E.164 format, for example +905551112233.')
      update.phone_e164 = phone
    }
  }
  if (patch.patientIdentifier !== undefined) update.patient_identifier = patch.patientIdentifier.trim() || null
  if (patch.notes !== undefined) update.notes = patch.notes.trim() || null
  if (patch.status !== undefined) update.status = patch.status
  const { error } = await requireSupabase().from('customers').update(update).eq('id', id)
  if (error) throw error
}
