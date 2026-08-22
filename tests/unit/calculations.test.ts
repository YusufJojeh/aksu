import { describe, expect, it } from 'vitest'
import { finalTotalMinor, rowTotalMinor, toMinorUnits, visitTotalMinor } from '../../src/domain/calculations'
import { createDefaultReport } from '../../src/domain/report'

describe('financial calculations', () => {
  it('uses deterministic minor units', () => expect(toMinorUnits(10.005)).toBe(1001))
  it('calculates priced rows', () => {
    const report = createDefaultReport()
    expect(rowTotalMinor(report.firstVisit.treatmentRows[1]!)).toBe(342000)
    expect(visitTotalMinor(report.firstVisit.treatmentRows)).toBe(409400)
  })
  it('excludes included and disabled rows', () => {
    const report = createDefaultReport()
    const hotel = report.firstVisit.treatmentRows[6]!
    hotel.quantity = 8
    hotel.unitPrice = 999
    expect(rowTotalMinor(hotel)).toBe(0)
    report.firstVisit.treatmentRows[0]!.enabled = false
    expect(visitTotalMinor(report.firstVisit.treatmentRows)).toBe(387900)
  })
  it('supports manual and percentage discounts without exceeding gross', () => {
    const report = createDefaultReport()
    expect(finalTotalMinor(report)).toBe(377400)
    report.firstVisit.discountMode = 'percentage'
    report.firstVisit.discountPercentage = 10
    expect(finalTotalMinor(report)).toBe(368460)
    report.firstVisit.discountMode = 'manual_final_price'
    report.firstVisit.discountedFinalPrice = 99999
    expect(finalTotalMinor(report)).toBe(409400)
  })
  it('returns gross total when discount is off', () => {
    const report = createDefaultReport()
    report.firstVisit.discountEnabled = false
    expect(finalTotalMinor(report)).toBe(409400)
  })
})
