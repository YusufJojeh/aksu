import { describe, expect, it } from 'vitest'
import { normalizePhone } from '../../src/lib/phone'

describe('phone normalization', () => {
  it('normalizes formatted international numbers without losing country digits', () => {
    expect(normalizePhone('+90 555 111 22 33')).toBe('+905551112233')
    expect(normalizePhone('+32 (460) 94-73-57')).toBe('+32460947357')
  })

  it('rejects ambiguous national and malformed values', () => {
    expect(normalizePhone('0555 111 22 33')).toBeUndefined()
    expect(normalizePhone('+012345678')).toBeUndefined()
  })
})
