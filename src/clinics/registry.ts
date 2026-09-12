import { locales } from '../domain/report'
import type { ClinicDefinition, ClinicId } from './types'

export const clinicRegistry: Record<ClinicId, ClinicDefinition> = {
  aksu: {
    id: 'aksu',
    displayName: 'Dr. Emir Aksu',
    capabilities: { hasDiscount: true, hasPatientId: false, treatmentRowsPerVisit: 7 },
    supportedDocumentLocales: locales,
    defaultDocumentLocale: 'en',
    defaultCurrency: 'GBP',
    filenamePrefix: 'Doctor-Aksu-Treatment-Plan',
    pdfAuthor: 'Dr. Emir Aksu',
    pdfCreator: 'Doctor Aksu Treatment Plan Generator',
    docOnly: { secondVisitInterval: '3–6 months' },
  },
  'mb-dental': {
    id: 'mb-dental',
    displayName: 'MB Dental',
    capabilities: { hasDiscount: false, hasPatientId: true, treatmentRowsPerVisit: 6 },
    supportedDocumentLocales: ['en', 'fr', 'de', 'ar'],
    defaultDocumentLocale: 'en',
    defaultCurrency: 'EUR',
    filenamePrefix: 'MB-Dental-Treatment-Plan',
    pdfAuthor: 'MB Dental Turkey',
    pdfCreator: 'MB Dental Treatment Plan Generator',
  },
}
