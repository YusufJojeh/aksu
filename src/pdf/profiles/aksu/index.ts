import type { Locale } from '../../../domain/report'
import { arPdfCoordinates } from './ar'
import { enPdfCoordinates } from './en'
import { esPdfCoordinates } from './es'
import { frPdfCoordinates } from './fr'
import type { AksuPdfCoordinates } from './types'

export type { AksuPdfCoordinates, AksuTableGrid } from './types'

export type AksuLocale = 'en' | 'fr' | 'es' | 'ar'

export interface AksuTemplateDefinition {
  locale: AksuLocale
  clearDynamicRegions: boolean
  /** English prints its discount sentence into the gold bar; the other templates leave it blank. */
  clearDiscountRegion: boolean
  drawDiscountSentence: boolean
  drawSecondVisitHeading: boolean
  selectionStyle: 'navy' | 'gold'
}

const aksuTemplates: Record<AksuLocale, AksuTemplateDefinition> = {
  en: {
    locale: 'en', clearDynamicRegions: true, clearDiscountRegion: true, drawDiscountSentence: true,
    drawSecondVisitHeading: true, selectionStyle: 'navy',
  },
  // The French and Spanish artworks pre-print a sample treatment in each table, so their cells are
  // cleared like English. Their second-visit headings are printed by the artwork itself, so the
  // generator must not draw over them.
  fr: {
    locale: 'fr', clearDynamicRegions: true, clearDiscountRegion: false, drawDiscountSentence: true,
    drawSecondVisitHeading: false, selectionStyle: 'navy',
  },
  es: {
    locale: 'es', clearDynamicRegions: true, clearDiscountRegion: false, drawDiscountSentence: true,
    drawSecondVisitHeading: false, selectionStyle: 'navy',
  },
  ar: {
    locale: 'ar', clearDynamicRegions: false, clearDiscountRegion: false, drawDiscountSentence: false,
    drawSecondVisitHeading: false, selectionStyle: 'gold',
  },
}

const aksuCoordinatesByLocale: Record<AksuLocale, AksuPdfCoordinates> = {
  en: enPdfCoordinates, fr: frPdfCoordinates, es: esPdfCoordinates, ar: arPdfCoordinates,
}

export const availableAksuTemplateLocales: AksuLocale[] = ['en', 'fr', 'es', 'ar']

function isAksuLocale(locale: Locale): locale is AksuLocale {
  return (availableAksuTemplateLocales as Locale[]).includes(locale)
}

/** Unlike MB, Aksu offers every interface locale and falls back to its English artwork. */
export function resolveAksuTemplate(locale: Locale): { definition: AksuTemplateDefinition; usedFallback: boolean } {
  if (isAksuLocale(locale)) return { definition: aksuTemplates[locale], usedFallback: false }
  return { definition: aksuTemplates.en, usedFallback: true }
}

export function coordinatesForAksuTemplate(locale: Locale): AksuPdfCoordinates {
  return isAksuLocale(locale) ? aksuCoordinatesByLocale[locale] : enPdfCoordinates
}

/** Keyed export used by the dev-only PDF coordinate mapper tool. */
export const aksuPdfCoordinatesByLocale = aksuCoordinatesByLocale
