import { describe, expect, it } from 'vitest'
import { esPdfCoordinates } from '../../src/pdf/profiles/aksu/es'
import { frPdfCoordinates } from '../../src/pdf/profiles/aksu/fr'
import { enPdfCoordinates } from '../../src/pdf/profiles/aksu/en'
import { esMbPdfCoordinates } from '../../src/pdf/profiles/mb/es'
import { enMbPdfCoordinates } from '../../src/pdf/profiles/mb/en'
import { assessmentKeys, mbConditionKeys, mbRecommendedTreatmentKeys } from '../../src/domain/report'
import { resolveTemplate } from '../../src/pdf/profiles/resolve'

describe('Aksu French and Spanish templates', () => {
  it('resolves each to its own artwork, never to the English fallback', () => {
    expect(resolveTemplate('aksu', 'fr')).toMatchObject({ usedFallback: false, definition: { locale: 'fr' } })
    expect(resolveTemplate('aksu', 'es')).toMatchObject({ usedFallback: false, definition: { locale: 'es' } })
    expect(resolveTemplate('aksu', 'tr')).toMatchObject({ usedFallback: true, definition: { locale: 'en' } })
  })
  it('keeps French and Spanish on separately measured geometry', () => {
    // The two artworks are NOT interchangeable: the page-1 rules and the table row rules differ.
    expect(frPdfCoordinates.page1.reportDate.width).not.toBe(esPdfCoordinates.page1.reportDate.width)
    expect(frPdfCoordinates.page2.firstVisit.rows[0]!.treatment.y).not.toBe(esPdfCoordinates.page2.firstVisit.rows[0]!.treatment.y)
    expect(frPdfCoordinates.page2.assessment.missingTeeth).not.toEqual(esPdfCoordinates.page2.assessment.missingTeeth)
  })
  it('maps every assessment key to its own circle, in each artwork\'s own printed order', () => {
    for (const coordinates of [frPdfCoordinates, esPdfCoordinates]) {
      const points = assessmentKeys.map((key) => coordinates.page2.assessment[key])
      expect(points).toHaveLength(12)
      expect(new Set(points.map((point) => `${point.x}:${point.y}`)).size).toBe(12)
    }
    // French leads its first column with "Perte partielle ou totale des dents", Spanish with
    // "Restauraciones dentales existentes" — the same y, different keys.
    expect(frPdfCoordinates.page2.assessment.missingTeeth.y).toBe(659)
    expect(esPdfCoordinates.page2.assessment.existingDentalRestorations.y).toBe(659)
  })
  it('carries the measured grid every template with cleared cells needs to redraw', () => {
    for (const coordinates of [frPdfCoordinates, esPdfCoordinates, enPdfCoordinates]) {
      for (const visit of [coordinates.page2.firstVisit, coordinates.page2.secondVisit]) {
        expect(visit.grid).toBeDefined()
        expect(visit.grid!.verticals).toHaveLength(4)
        expect(visit.grid!.top).toBeGreaterThan(visit.grid!.bottom)
      }
    }
  })
  it('builds seven cells per visit, each inside its own gridline box', () => {
    for (const coordinates of [frPdfCoordinates, esPdfCoordinates]) {
      for (const visit of [coordinates.page2.firstVisit, coordinates.page2.secondVisit]) {
        expect(visit.rows).toHaveLength(7)
        for (const row of visit.rows) {
          expect(row.treatment.x).toBeLessThan(row.quality.x)
          expect(row.quality.x).toBeLessThan(row.quantity.x)
          expect(row.quantity.x).toBeLessThan(row.unitPrice.x)
          expect(row.unitPrice.x).toBeLessThan(row.total.x)
          expect(row.treatment.height).toBeGreaterThan(12)
        }
      }
    }
  })
})

describe('MB Spanish template', () => {
  it('resolves to its own artwork', () => {
    expect(resolveTemplate('mb-dental', 'es')).toMatchObject({ usedTemplate: 'es' })
  })
  it('reuses the English checkbox squares, which the Spanish artwork prints identically', () => {
    expect(esMbPdfCoordinates.oralHealth.currentCondition).toBe(enMbPdfCoordinates.oralHealth.currentCondition)
    expect(esMbPdfCoordinates.oralHealth.recommendedTreatments).toBe(enMbPdfCoordinates.oralHealth.recommendedTreatments)
    for (const key of mbConditionKeys) expect(esMbPdfCoordinates.oralHealth.currentCondition[key]).toBeDefined()
    // Spanish prints a fillings row and no extraction row, like English and German.
    for (const key of mbRecommendedTreatmentKeys) {
      expect(Boolean(esMbPdfCoordinates.oralHealth.recommendedTreatments[key])).toBe(key !== 'dentalExtractions')
    }
  })
  it('keeps every cover value clear of the photo edge at x=297', () => {
    for (const field of Object.values(esMbPdfCoordinates.cover)) {
      expect(field.x + field.width).toBeLessThanOrEqual(290)
      // Spanish prints the longest labels of any locale, so values take the line below rather than
      // being squeezed into 21pt beside "IDENTIFICADOR DEL PACIENTE".
      expect(field.width).toBeGreaterThan(150)
    }
  })
})
