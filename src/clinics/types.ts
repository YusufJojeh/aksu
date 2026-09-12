import type { Currency, Locale } from '../domain/report'

export const clinicIds = ['aksu', 'mb-dental'] as const
export type ClinicId = (typeof clinicIds)[number]

export interface ClinicCapabilities {
  hasDiscount: boolean
  hasPatientId: boolean
  treatmentRowsPerVisit: number
}

export interface ClinicDefinition {
  id: ClinicId
  displayName: string
  capabilities: ClinicCapabilities
  supportedDocumentLocales: readonly Locale[]
  defaultDocumentLocale: Locale
  defaultCurrency: Currency
  filenamePrefix: string
  pdfAuthor: string
  pdfCreator: string
  /** Fields consumed by exactly one clinic's PDF generator, kept out of the shared shape. */
  docOnly?: { secondVisitInterval?: string }
}
