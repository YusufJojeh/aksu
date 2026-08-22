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
