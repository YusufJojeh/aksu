import { requireSupabase } from '../supabase'
import { fromRow, optionalE164 } from './shared'

type CustomerStatus = 'active' | 'archived'

export interface Customer {
  id: string
  clinic_id: string
  full_name: string
  phone_e164: string | null
  patient_identifier: string | null
  notes: string | null
  status: CustomerStatus
  created_by_employee_id: string
  created_at: string
  updated_at: string
}

export async function listCustomers(): Promise<Customer[]> {
  const { data, error } = await requireSupabase()
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(fromRow<Customer>)
}

export async function createCustomer(input: {
  clinicId: string
  fullName: string
  phone?: string
  patientIdentifier?: string
  notes?: string
}): Promise<void> {
  const { error } = await requireSupabase()
    .from('customers')
    .insert({
      clinic_id: input.clinicId,
      full_name: input.fullName.trim(),
      phone_e164: optionalE164(input.phone),
      patient_identifier: input.patientIdentifier?.trim() || null,
      notes: input.notes?.trim() || null,
    })
  if (error) throw error
}

export async function updateCustomer(
  id: string,
  patch: { fullName?: string; phone?: string; patientIdentifier?: string; notes?: string; status?: CustomerStatus },
): Promise<void> {
  const update: {
    full_name?: string
    phone_e164?: string | null
    patient_identifier?: string | null
    notes?: string | null
    status?: CustomerStatus
  } = {}
  if (patch.fullName !== undefined) update.full_name = patch.fullName.trim()
  if (patch.phone !== undefined) update.phone_e164 = optionalE164(patch.phone)
  if (patch.patientIdentifier !== undefined) update.patient_identifier = patch.patientIdentifier.trim() || null
  if (patch.notes !== undefined) update.notes = patch.notes.trim() || null
  if (patch.status !== undefined) update.status = patch.status
  const { error } = await requireSupabase().from('customers').update(update).eq('id', id)
  if (error) throw error
}
