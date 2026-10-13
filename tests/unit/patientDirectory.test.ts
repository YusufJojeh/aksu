import { describe, expect, it } from 'vitest'
import { derivePatients } from '../../src/lib/patientDirectory'
import type { ArchivedReport, Customer } from '../../src/lib/operations'

const report = (over: Partial<ArchivedReport>) =>
  ({
    id: 'r',
    clinic_id: 'aksu',
    patient_name: 'Ali Yilmaz',
    patient_phone: '+905551112233',
    finalized_at: '2026-10-01T10:00:00Z',
    ...over,
  }) as ArchivedReport

describe('derivePatients', () => {
  it('lists a patient once however many reports, edits and clinics they have', () => {
    const rows = derivePatients(
      [
        report({ id: '1' }),
        report({ id: '2', finalized_at: '2026-10-05T10:00:00Z', clinic_id: 'mb-dental' }),
        report({ id: '3', patient_phone: '+90 555 111 22 33' }),
      ],
      [],
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ reportCount: 3, lastReportAt: '2026-10-05T10:00:00Z' })
    expect([...rows[0]!.clinics].sort()).toEqual(['aksu', 'mb-dental'])
  })

  it('separates different people and falls back to the name when there is no phone', () => {
    const rows = derivePatients(
      [
        report({ id: '1' }),
        report({ id: '2', patient_name: 'Sara', patient_phone: '' }),
        report({ id: '3', patient_name: 'SARA', patient_phone: '' }),
      ],
      [],
    )
    expect(rows.map((row) => row.reportCount).sort()).toEqual([1, 2])
  })

  it('skips patients that are already a managed customer', () => {
    const customer = { full_name: 'Ali Yilmaz', phone_e164: '+905551112233' } as Customer
    expect(derivePatients([report({})], [customer])).toEqual([])
  })
})
