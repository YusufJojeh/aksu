import { useLayoutEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { locales, type Locale } from '../../domain/report'
import { isRtl } from '../../lib/locale'

const ADMIN_LANG_KEY = 'admin_dashboard_locale'

function savedLocale(): Locale {
  try {
    const saved = localStorage.getItem(ADMIN_LANG_KEY)
    return (locales as readonly string[]).includes(saved ?? '') ? (saved as Locale) : 'en'
  } catch {
    return 'en'
  }
}

// One admin UI language for /admin: sign-in, account gates and the dashboard share it and it persists per browser.
export function useAdminLocale(): [Locale, (locale: Locale) => void] {
  const { i18n } = useTranslation()
  const [locale, setLocale] = useState<Locale>(savedLocale)

  // Side effects run after render (before paint), not during it, so React can render purely.
  useLayoutEffect(() => {
    if (i18n.language !== locale) void i18n.changeLanguage(locale)
    document.documentElement.lang = locale
    document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr'
    try {
      localStorage.setItem(ADMIN_LANG_KEY, locale)
    } catch {
      /* private browsing / storage disabled */
    }
  }, [i18n, locale])

  return [locale, setLocale]
}
