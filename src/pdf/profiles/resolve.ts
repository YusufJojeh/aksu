import type { ClinicId } from '../../clinics/types'
import type { Locale } from '../../domain/report'
import { coordinatesForAksuTemplate, resolveAksuTemplate, type AksuPdfCoordinates, type AksuTemplateDefinition } from './aksu'
import { coordinatesForMbTemplate, resolveMbTemplate, type MbPdfCoordinates } from './mb'

export type ResolvedTemplate =
  | { clinicId: 'aksu'; usedTemplate: Locale; usedFallback: boolean; definition: AksuTemplateDefinition }
  | { clinicId: 'mb-dental'; usedTemplate: Locale; usedFallback: false }

/**
 * Template identity is (clinic, locale) — never locale alone. Two clinics sharing a locale
 * (e.g. both offer "en") must never resolve to the same cached template or the same artwork.
 */
export function resolveTemplate(clinicId: ClinicId, locale: Locale): ResolvedTemplate {
  if (clinicId === 'aksu') {
    const { definition, usedFallback } = resolveAksuTemplate(locale)
    return { clinicId: 'aksu', usedTemplate: definition.locale, usedFallback, definition }
  }
  const { usedTemplate } = resolveMbTemplate(locale)
  return { clinicId: 'mb-dental', usedTemplate, usedFallback: false }
}

export function coordinatesForTemplate(clinicId: 'aksu', locale: Locale): AksuPdfCoordinates
export function coordinatesForTemplate(clinicId: 'mb-dental', locale: Locale): MbPdfCoordinates
export function coordinatesForTemplate(clinicId: ClinicId, locale: Locale): AksuPdfCoordinates | MbPdfCoordinates {
  if (clinicId === 'aksu') return coordinatesForAksuTemplate(locale)
  const { usedTemplate } = resolveMbTemplate(locale)
  return coordinatesForMbTemplate(usedTemplate)
}
