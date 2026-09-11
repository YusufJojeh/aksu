import { describe, expect, it } from 'vitest'
import { finalTotalMinor, rowTotalMinor, toMinorUnits, visitTotalMinor } from '../../src/domain/calculations'
import { createDefaultReport } from '../../src/domain/report'

describe('financial calculations', () => {
  it('uses deterministic minor units', () => expect(toMinorUnits(10.005)).toBe(1001))
  it('calculates priced rows', () => {
    const report = createDefaultReport()
    report.firstVisit.treatmentRows[1]!.quantity = 20
    report.firstVisit.treatmentRows[1]!.unitPrice = 171
    expect(rowTotalMinor(report.firstVisit.treatmentRows[1]!)).toBe(342000)
    expect(visitTotalMinor(report.firstVisit.treatmentRows)).toBe(342000)
  })
  it('excludes included and disabled rows', () => {
    const report = createDefaultReport()
    const hotel = report.firstVisit.treatmentRows[6]!
    hotel.included = true
    hotel.quantity = 8
    hotel.unitPrice = 999
    expect(rowTotalMinor(hotel)).toBe(0)
    expect(visitTotalMinor(report.firstVisit.treatmentRows)).toBe(0)
  })
  it('supports manual and percentage discounts without exceeding gross', () => {
    const report = createDefaultReport()
    report.firstVisit.treatmentRows[0]!.quantity = 2
    report.firstVisit.treatmentRows[0]!.unitPrice = 100
    report.firstVisit.discountEnabled = true
    report.firstVisit.discountedFinalPrice = 175
    expect(finalTotalMinor(report)).toBe(17500)
    report.firstVisit.discountMode = 'percentage'
    report.firstVisit.discountPercentage = 10
    expect(finalTotalMinor(report)).toBe(18000)
    report.firstVisit.discountMode = 'manual_final_price'
    report.firstVisit.discountedFinalPrice = 99999
    expect(finalTotalMinor(report)).toBe(20000)
  })
  it('returns gross total when discount is off', () => {
    const report = createDefaultReport()
    report.firstVisit.discountEnabled = false
    expect(finalTotalMinor(report)).toBe(0)
  })
})
