import { describe, expect, it } from 'vitest'
import { clinicRegistry } from '../../src/clinics/registry'
import { clinicIds } from '../../src/clinics/types'

describe('clinic registry', () => {
  it('registers every known clinic id', () => {
    expect(Object.keys(clinicRegistry).sort()).toEqual([...clinicIds].sort())
  })
  it('gives Aksu discount capability and no patient ID, seven rows per visit', () => {
    expect(clinicRegistry.aksu.capabilities).toEqual({ hasDiscount: true, hasPatientId: false, treatmentRowsPerVisit: 7 })
  })
  it('gives MB Dental patient ID capability and no discount, six rows per visit', () => {
    expect(clinicRegistry['mb-dental'].capabilities).toEqual({ hasDiscount: false, hasPatientId: true, treatmentRowsPerVisit: 6 })
  })
  it('scopes MB Dental to its five evidenced document locales', () => {
    expect(clinicRegistry['mb-dental'].supportedDocumentLocales).toEqual(['en', 'fr', 'de', 'es', 'ar'])
  })
  it('defaults MB Dental pricing to EUR and Aksu to GBP', () => {
    expect(clinicRegistry['mb-dental'].defaultCurrency).toBe('EUR')
    expect(clinicRegistry.aksu.defaultCurrency).toBe('GBP')
  })
})
