import type { Locale } from '../domain/report'

export interface PdfTemplateDefinition {
  locale: 'en' | 'ar'
  clearDynamicRegions: boolean
  drawDiscountSentence: boolean
  drawSecondVisitHeading: boolean
  redrawTableGrid: boolean
  selectionStyle: 'navy' | 'gold'
}

export const pdfTemplates: Record<'en' | 'ar', PdfTemplateDefinition> = {
  en: {
    locale: 'en', clearDynamicRegions: true, drawDiscountSentence: true,
    drawSecondVisitHeading: true, redrawTableGrid: true, selectionStyle: 'navy',
  },
  ar: {
    locale: 'ar', clearDynamicRegions: false, drawDiscountSentence: false,
    drawSecondVisitHeading: false, redrawTableGrid: false, selectionStyle: 'gold',
  },
}

export const availableLocalizedTemplates: Locale[] = ['en', 'ar']

export function resolveTemplate(locale: Locale): { definition: PdfTemplateDefinition; usedFallback: boolean } {
  if (locale === 'ar') return { definition: pdfTemplates.ar, usedFallback: false }
  return { definition: pdfTemplates.en, usedFallback: locale !== 'en' }
}

export const templateRequiresDiscountExpiry = (locale: Locale): boolean => locale !== 'ar'
