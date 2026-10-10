import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { locales, type Currency, type Locale } from '../../../domain/report'
import { formatMoneyMinor, isRtl, localeTags } from '../../../lib/locale'

export function useDashboardFormat() {
  const { i18n } = useTranslation()
  const locale: Locale = (locales as readonly string[]).includes(i18n.language) ? (i18n.language as Locale) : 'en'
  const tag = localeTags[locale]
  const number = new Intl.NumberFormat(tag, { maximumFractionDigits: 1 })
  const relative = new Intl.RelativeTimeFormat(tag, { numeric: 'auto' })
  return {
    locale,
    tag,
    rtl: isRtl(locale),
    number: (value: number) => number.format(value),
    money: (minor: number, currency: string) => formatMoneyMinor(minor, currency as Currency, locale),
    daysAgo: (days: number) => relative.format(-days, 'day'),
    shortDate: (dayKey: string) =>
      new Date(`${dayKey}T12:00:00`).toLocaleDateString(tag, { month: 'short', day: 'numeric' }),
    percent: (value: number) =>
      new Intl.NumberFormat(tag, { style: 'percent', maximumFractionDigits: 0 }).format(value / 100),
    // 2024-01-01 was a Monday, so index 0 = Monday like the analytics heatmap.
    weekday: (index: number, style: 'short' | 'long' = 'short') =>
      new Date(2024, 0, 1 + index).toLocaleDateString(tag, { weekday: style }),
    hour: (hour: number) => new Date(2024, 0, 1, hour).toLocaleTimeString(tag, { hour: '2-digit', minute: '2-digit' }),
  }
}

const PALETTE_SIZE = 8

/** Categorical colour by position (distribution segments, legends). */
export function paletteColor(index: number): string {
  return `var(--dash-${(index % PALETTE_SIZE) + 1})`
}

/** Stable colour per employee so the same person has the same colour in every chart and range. */
export function employeeColor(id: string): string {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return paletteColor(hash)
}

/** Translucent tint of a palette colour, for chips and avatar backgrounds. */
export function tint(color: string, percent: number): string {
  return `color-mix(in oklab, ${color} ${percent}%, transparent)`
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
  )
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!query) return
    const update = () => setReduced(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return reduced
}

/** Currencies sorted by value so the dominant currency reads first. */
export function currencyEntries(values: Record<string, number>): [string, number][] {
  return Object.entries(values).sort((a, b) => b[1] - a[1])
}
