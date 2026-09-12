import { describe, expect, it } from 'vitest'
import { createDefaultReport, reportSchema, type MbReportData } from '../../src/domain/report'

describe('report validation', () => {
  it('accepts a valid Aksu report', () => {
    const report = createDefaultReport('aksu')
    report.patient.name = 'Adrian Jacek'; report.patient.phone = '+44 7985 747921'
    expect(reportSchema.safeParse(report).success).toBe(true)
  })
  it('does not require discount expiry for the Arabic template', () => {
    const report = createDefaultReport('aksu')
    report.patient.name = 'مريض جديد'; report.patient.phone = '+90 555 000 0000'
    report.document.locale = 'ar'; report.document.currency = 'EUR'
    report.firstVisit.discountEnabled = true; report.firstVisit.discountedFinalPrice = 100
    expect(reportSchema.safeParse(report).success).toBe(true)
  })
  it('requires discount expiry for the English template', () => {
    const report = createDefaultReport('aksu')
    report.patient.name = 'New patient'; report.patient.phone = '+44 7000 000000'
    report.firstVisit.discountEnabled = true; report.firstVisit.discountedFinalPrice = 100
    expect(reportSchema.safeParse(report).success).toBe(false)
  })
  it('rejects invalid age and missing identity', () => {
    const report = createDefaultReport('aksu'); report.patient.age = 121
    expect(reportSchema.safeParse(report).success).toBe(false)
  })
  it('accepts a valid MB Dental report', () => {
    const report = createDefaultReport('mb-dental')
    report.patient.name = 'Marie Dupont'; report.patient.phone = '+33 6 12 34 56 78'; report.patient.patientId = 'MB-1042'
    expect(reportSchema.safeParse(report).success).toBe(true)
  })
  it('requires a patient ID for MB Dental reports', () => {
    const report = createDefaultReport('mb-dental')
    report.patient.name = 'Marie Dupont'; report.patient.phone = '+33 6 12 34 56 78'; report.patient.patientId = ''
    expect(reportSchema.safeParse(report).success).toBe(false)
  })
  it('has no discount fields on the MB Dental type', () => {
    const report = createDefaultReport('mb-dental') as MbReportData
    // @ts-expect-error MB Dental has no discount capability — the field must not exist on its type
    expect(report.firstVisit.discountEnabled).toBeUndefined()
  })
})
