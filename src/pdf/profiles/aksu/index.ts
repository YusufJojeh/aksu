import type { Locale } from '../../../domain/report'
import { arPdfCoordinates } from './ar'
import { enPdfCoordinates } from './en'
import type { AksuPdfCoordinates } from './types'

export type { AksuPdfCoordinates } from './types'

export interface AksuTemplateDefinition {
  locale: 'en' | 'ar'
  clearDynamicRegions: boolean
  drawDiscountSentence: boolean
  drawSecondVisitHeading: boolean
  redrawTableGrid: boolean
  selectionStyle: 'navy' | 'gold'
}

const aksuTemplates: Record<'en' | 'ar', AksuTemplateDefinition> = {
  en: {
    locale: 'en', clearDynamicRegions: true, drawDiscountSentence: true,
    drawSecondVisitHeading: true, redrawTableGrid: true, selectionStyle: 'navy',
  },
  ar: {
    locale: 'ar', clearDynamicRegions: false, drawDiscountSentence: false,
    drawSecondVisitHeading: false, redrawTableGrid: false, selectionStyle: 'gold',
  },
}

const aksuCoordinatesByLocale: Record<'en' | 'ar', AksuPdfCoordinates> = { en: enPdfCoordinates, ar: arPdfCoordinates }

export const availableAksuTemplateLocales: Locale[] = ['en', 'ar']

export function resolveAksuTemplate(locale: Locale): { definition: AksuTemplateDefinition; usedFallback: boolean } {
  if (locale === 'ar') return { definition: aksuTemplates.ar, usedFallback: false }
  return { definition: aksuTemplates.en, usedFallback: locale !== 'en' }
}

export function coordinatesForAksuTemplate(locale: Locale): AksuPdfCoordinates {
  return locale === 'ar' ? arPdfCoordinates : enPdfCoordinates
}

/** Keyed export used by the dev-only PDF coordinate mapper tool. */
export const aksuPdfCoordinatesByLocale = aksuCoordinatesByLocale
