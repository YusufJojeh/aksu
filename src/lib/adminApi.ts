export interface ReportLogEntry {
  id: string
  employee_name: string
  clinic_id: string
  locale: string
  patient_name: string
  created_at: string
}

export interface AnalyticsResponse {
  byEmployee: { employee_name: string; count: number }[]
  byClinic: { clinic_id: string; count: number }[]
  byDay: { day: string; count: number }[]
  total: number
}

async function parseJson<T>(res: Response): Promise<T> {
  const data: unknown = await res.json().catch(() => undefined)
  if (!res.ok) {
    const message = (data as { error?: string } | undefined)?.error
    throw new Error(message ?? `Request failed (${res.status})`)
  }
  return data as T
}

export async function checkAdminSession(): Promise<boolean> {
  const data = await parseJson<{ authenticated: boolean }>(await fetch('/api/admin/session'))
  return data.authenticated
}

export async function adminLogin(passcode: string): Promise<void> {
  await parseJson(await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode }),
  }))
}

export async function adminLogout(): Promise<void> {
  await fetch('/api/admin/logout', { method: 'POST' })
}

export interface ReportFilters {
  employeeName?: string
  clinicId?: string
  from?: string
  to?: string
}

export async function fetchReports(filters: ReportFilters): Promise<ReportLogEntry[]> {
  const params = new URLSearchParams()
  if (filters.employeeName) params.set('employeeName', filters.employeeName)
  if (filters.clinicId) params.set('clinicId', filters.clinicId)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  const data = await parseJson<{ reports: ReportLogEntry[] }>(await fetch(`/api/reports?${params.toString()}`))
  return data.reports
}

export async function fetchAnalytics(): Promise<AnalyticsResponse> {
  return parseJson<AnalyticsResponse>(await fetch('/api/admin/analytics'))
}

export function reportFileUrl(id: string): string {
  return `/api/admin/reports/${id}/file`
}
