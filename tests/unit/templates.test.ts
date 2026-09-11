import { describe, expect, it } from 'vitest'
import { arPdfCoordinates } from '../../src/pdf/coordinates/ar'
import { resolveTemplate } from '../../src/pdf/templates'

describe('PDF templates', () => {
  it('selects the real Arabic template without fallback', () => {
    expect(resolveTemplate('ar')).toMatchObject({ usedFallback: false, definition: { locale: 'ar' } })
  })
  it('maps Arabic treatment columns right-to-left', () => {
    const row = arPdfCoordinates.page2.firstVisit.rows[0]!
    expect(row.treatment.x).toBeGreaterThan(row.quality.x)
    expect(row.quality.x).toBeGreaterThan(row.quantity.x)
    expect(row.quantity.x).toBeGreaterThan(row.unitPrice.x)
    expect(row.unitPrice.x).toBeGreaterThan(row.total.x)
  })
  it('maps all twelve semantic assessment keys', () => {
    expect(Object.keys(arPdfCoordinates.page2.assessment)).toHaveLength(12)
    expect(arPdfCoordinates.page2.assessment.missingTeeth.x).toBeCloseTo(547.1)
    expect(arPdfCoordinates.page2.assessment.dentalAbscesses.x).toBeCloseTo(187.1)
  })
})
