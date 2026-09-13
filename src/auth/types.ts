export type UserRole = 'ADMIN' | 'SALES'
export type EmployeeStatus = 'pending' | 'active' | 'suspended' | 'former'

export interface EmployeeProfile {
  id: string
  full_name: string
  email: string
  role: UserRole
  status: EmployeeStatus
  requested_phone_e164: string
  created_at: string
  updated_at: string
}
