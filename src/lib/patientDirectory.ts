import { nameKey } from './mbImport'
import type { ArchivedReport, Customer } from './operations'

export interface ReportPatient {
  key: string
  name: string
  phone: string
  identifier: string
  clinics: string[]
  reportCount: number
  lastReportAt: string
}

/** Same person = same phone (digits only); without a phone, same normalised name. */
export function patientKey(name: string, phone?: string | null): string {
  const digits = (phone ?? '').replace(/\D/g, '')
  return digits.length >= 7 ? `p:${digits}` : `n:${nameKey(name)}`
}

/**
 * Every patient who has a finalized report, once each: edited copies, repeat visits and clinic switches fold
 * into one row (newest report wins for the displayed name). Patients already kept as a managed customer
 * (matching phone or name) are left out so nobody is listed twice.
 */
export function derivePatients(reports: ArchivedReport[], customers: Customer[]): ReportPatient[] {
  const managed = new Set(
    customers.flatMap((customer) => [
      patientKey(customer.full_name, customer.phone_e164),
      `n:${nameKey(customer.full_name)}`,
    ]),
  )
  const byKey = new Map<string, ReportPatient>()
  for (const report of [...reports].sort((a, b) => b.finalized_at.localeCompare(a.finalized_at))) {
    const key = patientKey(report.patient_name, report.patient_phone)
    if (managed.has(key) || managed.has(`n:${nameKey(report.patient_name)}`)) continue
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, {
        key,
        name: report.patient_name.trim(),
        phone: report.patient_phone,
        identifier: report.patient_identifier ?? '',
        clinics: [report.clinic_id],
        reportCount: 1,
        lastReportAt: report.finalized_at,
      })
      continue
    }
    existing.reportCount += 1
    if (!existing.clinics.includes(report.clinic_id)) existing.clinics.push(report.clinic_id)
    if (!existing.identifier && report.patient_identifier) existing.identifier = report.patient_identifier
  }
  return [...byKey.values()]
}
