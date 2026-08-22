import { describe, expect, it } from 'vitest'
import { createDefaultReport, reportSchema } from '../../src/domain/report'

describe('report validation', () => {
  it('accepts a valid report', () => {
    const report = createDefaultReport()
    report.patient.name = 'Adrian Jacek'; report.patient.phone = '+44 7985 747921'; report.firstVisit.discountExpiryDate = '2026-09-10'
    expect(reportSchema.safeParse(report).success).toBe(true)
  })
  it('rejects invalid age and missing identity', () => {
    const report = createDefaultReport(); report.patient.age = 121
    expect(reportSchema.safeParse(report).success).toBe(false)
  })
})
