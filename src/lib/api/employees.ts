import type { EmployeeProfile, EmployeeStatus, UserRole } from '../../auth/types'
import { requireSupabase } from '../supabase'
import { authedPost, fromRow, requireE164 } from './shared'

export async function listEmployees(): Promise<EmployeeProfile[]> {
  const { data, error } = await requireSupabase().from('profiles').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data.map(fromRow<EmployeeProfile>)
}

export async function createEmployee(input: { fullName: string; email: string; workPhone: string }): Promise<void> {
  const workPhoneE164 = requireE164(input.workPhone)
  await authedPost(
    '/api/admin/create-employee',
    { fullName: input.fullName.trim(), email: input.email.trim().toLowerCase(), workPhoneE164 },
    'create_failed',
    'Request failed',
  )
}

export async function deleteEmployee(id: string): Promise<void> {
  await authedPost('/api/admin/delete-employee', { employeeId: id }, 'delete_failed', 'Request failed')
}

export async function updateEmployee(
  id: string,
  patch: { full_name?: string; role?: UserRole; status?: EmployeeStatus },
): Promise<void> {
  const { error } = await requireSupabase().from('profiles').update(patch).eq('id', id)
  if (error) throw error
}

export async function offboardEmployee(id: string, status: 'suspended' | 'former'): Promise<void> {
  const { error } = await requireSupabase().rpc('offboard_employee', { p_employee_id: id, p_status: status })
  if (error) throw error
}
