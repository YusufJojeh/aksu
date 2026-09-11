import { describe, expect, it } from 'vitest'
import { createDefaultReport, reportSchema } from '../../src/domain/report'

describe('report validation', () => {
  it('accepts a valid report', () => {
    const report = createDefaultReport()
    report.patient.name = 'Adrian Jacek'; report.patient.phone = '+44 7985 747921'
    expect(reportSchema.safeParse(report).success).toBe(true)
  })
  it('does not require discount expiry for the Arabic template', () => {
    const report = createDefaultReport()
    report.patient.name = 'مريض جديد'; report.patient.phone = '+90 555 000 0000'
    report.document.locale = 'ar'; report.document.currency = 'EUR'
    report.firstVisit.discountEnabled = true; report.firstVisit.discountedFinalPrice = 100
    expect(reportSchema.safeParse(report).success).toBe(true)
  })
  it('requires discount expiry for the English template', () => {
    const report = createDefaultReport()
    report.patient.name = 'New patient'; report.patient.phone = '+44 7000 000000'
    report.firstVisit.discountEnabled = true; report.firstVisit.discountedFinalPrice = 100
    expect(reportSchema.safeParse(report).success).toBe(false)
  })
  it('rejects invalid age and missing identity', () => {
    const report = createDefaultReport(); report.patient.age = 121
    expect(reportSchema.safeParse(report).success).toBe(false)
  })
})
