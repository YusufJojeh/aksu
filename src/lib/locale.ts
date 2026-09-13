import type { ClinicId } from '../clinics/types'
import type { Currency, Locale } from '../domain/report'

export const localeTags: Record<Locale, string> = {
  en: 'en-GB', ar: 'ar-SA', fr: 'fr-FR', tr: 'tr-TR', de: 'de-DE', es: 'es-ES',
  ru: 'ru-RU', pl: 'pl-PL', it: 'it-IT',
}

export const isRtl = (locale: Locale): boolean => locale === 'ar'

export function formatMoneyMinor(minor: number, currency: Currency, locale: Locale): string {
  return new Intl.NumberFormat(localeTags[locale], {
    style: 'currency', currency, minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2, currencyDisplay: 'narrowSymbol',
  }).format(minor / 100)
}

// The Aksu Arabic template spells out "يورو" for EUR (its own calibrated convention), but the real
// filled MB Dental Arabic reports (e.g. السيد خالد..pdf) print the plain "€" symbol like every other
// currency — so MB opts out of the spelled-out form via `clinicId`.
export function formatDocumentMoneyMinor(minor: number, currency: Currency, locale: Locale, clinicId?: ClinicId): string {
  const amount = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(minor / 100)
  if (locale === 'ar' && currency === 'EUR' && clinicId !== 'mb-dental') return `${amount} يورو`
  const symbols: Record<Currency, string> = { GBP: '£', EUR: '€', USD: '$', TRY: '₺' }
  return `${symbols[currency]}${amount}`
}

export function formatReportDate(value: string, locale: Locale): string {
  if (!value) return ''
  if (locale === 'ar') {
    const [year, month, day] = value.split('-')
    return `${day}/${month}/${year}`
  }
  const date = new Date(`${value}T12:00:00`)
  return new Intl.DateTimeFormat(localeTags[locale], { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

export function formatLongDate(value: string, locale: Locale): string {
  if (!value) return ''
  const date = new Date(`${value}T12:00:00`)
  return new Intl.DateTimeFormat(localeTags[locale], { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}
