import { describe, expect, it } from 'vitest'
import { pickEmployeeProfile, type LoginCandidate } from '../../src/lib/employeeLogin'

const profile = (id: string, patch: Partial<LoginCandidate> = {}): LoginCandidate => ({
  id,
  email: `${id}@x.test`,
  role: 'SALES',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  ...patch,
})

describe('pickEmployeeProfile', () => {
  it('returns nothing for an unknown phone', () => {
    expect(pickEmployeeProfile([], new Map())).toBeUndefined()
  })

  it('never signs in to an admin account, even next to a sales profile on the same phone', () => {
    expect(pickEmployeeProfile([profile('admin', { role: 'ADMIN' })], new Map())).toBeUndefined()
    expect(pickEmployeeProfile([profile('admin', { role: 'ADMIN' }), profile('sales')], new Map())).toBeUndefined()
  })

  it('ignores pending, suspended and former profiles', () => {
    const candidates = [
      profile('p', { status: 'pending' }),
      profile('s', { status: 'suspended' }),
      profile('f', { status: 'former' }),
    ]
    expect(pickEmployeeProfile(candidates, new Map([['f', 50]]))).toBeUndefined()
  })

  it('picks the duplicate holding the most reports, then the oldest', () => {
    const candidates = [
      profile('typo', { created_at: '2026-01-01T00:00:00Z' }),
      profile('real', { created_at: '2026-03-01T00:00:00Z' }),
    ]
    expect(
      pickEmployeeProfile(
        candidates,
        new Map([
          ['real', 12],
          ['typo', 2],
        ]),
      )?.id,
    ).toBe('real')
    expect(pickEmployeeProfile(candidates, new Map())?.id).toBe('typo')
  })
})
