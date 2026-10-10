import { describe, expect, it } from 'vitest'
import en from '../../src/i18n/locales/en.json'
import i18n from '../../src/i18n'
import { errorText } from '../../src/i18n/errorText'
import { APP_ERROR_CODES, AppError, errorFromBody } from '../../src/lib/appError'

describe('coded errors', () => {
  it('has an English message for every code (other locales are covered by locale parity)', () => {
    const messages = en.errors as Record<string, string>
    expect(APP_ERROR_CODES.filter((code) => !messages[code])).toEqual([])
    expect(Object.keys(messages).filter((key) => !(APP_ERROR_CODES as readonly string[]).includes(key))).toEqual([])
  })

  it('reads the code from an endpoint body, its snake_case error, or the fallback', () => {
    expect(
      errorFromBody({ error: 'Invalid phone number or password.', code: 'invalid_credentials' }, 'sign_in_failed', 'x')
        .code,
    ).toBe('invalid_credentials')
    expect(errorFromBody({ error: 'email_already_registered' }, 'invite_failed', 'x').code).toBe(
      'email_already_registered',
    )
    expect(errorFromBody({ error: 'checksum_write_failed' }, 'request_failed', 'x').code).toBe('verify_failed')
    const fallback = errorFromBody({}, 'finalize_failed', 'Failed to finalize report.')
    expect([fallback.code, fallback.message]).toEqual(['finalize_failed', 'Failed to finalize report.'])
  })

  it('translates coded errors and hides uncoded internals behind the screen fallback', async () => {
    await i18n.changeLanguage('fr')
    const t = i18n.t.bind(i18n)
    expect(errorText(new AppError('pdf_too_large', 'The PDF is too large.'), t, 'sales.errors.downloadFailed')).toBe(
      'Le PDF est trop volumineux.',
    )
    expect(errorText(new Error('new row violates row-level security policy'), t, 'sales.errors.downloadFailed')).toBe(
      i18n.t('sales.errors.downloadFailed'),
    )
    await i18n.changeLanguage('en')
  })
})
