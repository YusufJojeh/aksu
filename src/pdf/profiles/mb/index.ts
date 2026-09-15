import type { Locale } from '../../../domain/report'
import { arMbPdfCoordinates } from './ar'
import { deMbPdfCoordinates } from './de'
import { enMbPdfCoordinates } from './en'
import { esMbPdfCoordinates } from './es'
import { frMbPdfCoordinates } from './fr'
import type { MbPdfCoordinates } from './types'

export type { MbPdfCoordinates } from './types'

export type MbLocale = 'en' | 'fr' | 'de' | 'es' | 'ar'

const mbCoordinatesByLocale: Record<MbLocale, MbPdfCoordinates> = {
  en: enMbPdfCoordinates, fr: frMbPdfCoordinates, de: deMbPdfCoordinates, es: esMbPdfCoordinates, ar: arMbPdfCoordinates,
}

export const availableMbTemplateLocales: MbLocale[] = ['en', 'fr', 'de', 'es', 'ar']

function isMbLocale(locale: Locale): locale is MbLocale {
  return (availableMbTemplateLocales as Locale[]).includes(locale)
}

// MB Dental has exactly 5 template PDFs (evidence: 5 supplied source documents). There is no
// cross-clinic and no cross-locale fallback, ever — an unsupported locale is a hard error, never
// a silent substitution for Aksu's or MB's own English artwork.
export function resolveMbTemplate(locale: Locale): { usedTemplate: MbLocale } {
  if (!isMbLocale(locale)) {
    throw new Error(`MB Dental has no template for locale "${locale}". Supported locales: ${availableMbTemplateLocales.join(', ')}.`)
  }
  return { usedTemplate: locale }
}

export function coordinatesForMbTemplate(locale: MbLocale): MbPdfCoordinates {
  return mbCoordinatesByLocale[locale]
}
