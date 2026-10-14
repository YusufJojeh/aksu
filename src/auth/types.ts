import type { ClinicId } from '../clinics/types'

export type UserRole = 'ADMIN' | 'TEAM_LEAD' | 'SALES'

/** Admins and team leads both work in /admin; only admins change accounts, numbers and customers. */
export const isManagerRole = (role: UserRole | undefined) => role === 'ADMIN' || role === 'TEAM_LEAD'
export type EmployeeStatus = 'pending' | 'active' | 'suspended' | 'former'

export interface EmployeeProfile {
  id: string
  full_name: string
  email: string
  role: UserRole
  status: EmployeeStatus
  requested_phone_e164: string
  /** When set, this employee works in that clinic only and never sees the clinic picker. */
  clinic_id: ClinicId | null
  created_at: string
  updated_at: string
}
