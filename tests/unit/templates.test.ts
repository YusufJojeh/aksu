import { describe, expect, it } from 'vitest'
import { arPdfCoordinates } from '../../src/pdf/profiles/aksu/ar'
import { enPdfCoordinates } from '../../src/pdf/profiles/aksu/en'
import { mbArabicCellSizes, mbEnglishCellSizes, mbLatinCellSizes } from '../../src/pdf/profiles/mb/table'
import { coordinatesForTemplate, resolveTemplate } from '../../src/pdf/profiles/resolve'
import { createDefaultReport } from '../../src/domain/report'
import { formatPdfMoney } from '../../src/pdf/generators/shared'

describe('PDF templates', () => {
  it('selects the real Arabic Aksu template without fallback', () => {
    expect(resolveTemplate('aksu', 'ar')).toMatchObject({ usedFallback: false, definition: { locale: 'ar' } })
  })
  it('maps Arabic treatment columns right-to-left', () => {
    const row = arPdfCoordinates.page2.firstVisit.rows[0]!
    expect(row.treatment.x).toBeGreaterThan(row.quality.x)
    expect(row.quality.x).toBeGreaterThan(row.quantity.x)
    expect(row.quantity.x).toBeGreaterThan(row.unitPrice.x)
    expect(row.unitPrice.x).toBeGreaterThan(row.total.x)
  })
  it('uses larger readable table fonts for both clinic templates', () => {
    expect(enPdfCoordinates.page2.firstVisit.rows[0]!.treatment.fontSize).toBe(15)
    expect(enPdfCoordinates.page2.firstVisit.rows[0]!.total.fontSize).toBe(13)
    expect(arPdfCoordinates.page2.firstVisit.rows[0]!.treatment.fontSize).toBe(14)
    expect(mbEnglishCellSizes.treatment.fontSize).toBe(21)
    expect(mbLatinCellSizes.treatment.fontSize).toBe(19)
    expect(mbArabicCellSizes.total.fontSize).toBe(21)
  })
  it('adds breathing room between the Aksu currency symbol and number in PDFs', () => {
    const report = createDefaultReport('aksu')
    report.document.currency = 'EUR'
    expect(formatPdfMoney(727400, report)).toBe('€ 7,274')
  })
  it('maps all twelve semantic assessment keys', () => {
    expect(Object.keys(arPdfCoordinates.page2.assessment)).toHaveLength(12)
    expect(arPdfCoordinates.page2.assessment.missingTeeth.x).toBeCloseTo(547.1)
    expect(arPdfCoordinates.page2.assessment.dentalAbscesses.x).toBeCloseTo(187.1)
  })
  it('never falls back to another locale for MB Dental', () => {
    expect(() => resolveTemplate('mb-dental', 'tr')).toThrow(/no template/)
  })
  it('keys coordinate resolution by clinic and locale, never locale alone', () => {
    expect(coordinatesForTemplate('aksu', 'en')).not.toBe(coordinatesForTemplate('mb-dental', 'en'))
  })
})
