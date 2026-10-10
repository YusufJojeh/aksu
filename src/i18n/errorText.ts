import type { TFunction } from 'i18next'
import { AppError } from '../lib/appError'

/**
 * Text to show for a caught failure in the current language. Coded failures get their own message;
 * anything else (raw database or network errors) gets the screen's translated fallback rather than
 * untranslated internals.
 */
export function errorText(caught: unknown, t: TFunction, fallbackKey: string): string {
  return caught instanceof AppError ? t(`errors.${caught.code}`) : t(fallbackKey)
}
