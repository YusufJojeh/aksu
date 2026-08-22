import { describe, expect, it } from 'vitest'
import { formatMoneyMinor, isRtl } from '../../src/lib/locale'

describe('locale utilities', () => {
  it('sets RTL only for Arabic', () => { expect(isRtl('ar')).toBe(true); expect(isRtl('fr')).toBe(false) })
  it('formats every supported currency', () => {
    expect(formatMoneyMinor(123400, 'GBP', 'en')).toContain('£')
    expect(formatMoneyMinor(123400, 'EUR', 'fr')).toContain('€')
    expect(formatMoneyMinor(123400, 'USD', 'en')).toContain('$')
    expect(formatMoneyMinor(123400, 'TRY', 'tr')).toContain('₺')
  })
})
