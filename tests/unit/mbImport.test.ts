import { describe, expect, it } from 'vitest'
import { nameKey, planMbImport, type ExistingProfile } from '../../src/lib/mbImport'

const profile = (over: Partial<ExistingProfile>): ExistingProfile => ({
  id: 'p1',
  full_name: 'Someone',
  requested_phone_e164: '+905000000000',
  role: 'SALES',
  status: 'active',
  clinic_id: null,
  ...over,
})

describe('MB employee import plan', () => {
  it('normalises names regardless of case, accents and spacing', () => {
    expect(nameKey('  HADYL ')).toBe('hadyl')
    expect(nameKey('Sérgio  Almeida')).toBe('sergio almeida')
  })

  it('creates an employee that does not exist yet', () => {
    const plan = planMbImport([{ name: 'Lamia', phone: '+905550669467' }], [])
    expect(plan.map((a) => a.kind)).toEqual(['create'])
  })

  it('locks, instead of duplicating, a live profile that already uses the phone', () => {
    const existing = profile({ full_name: 'Lamia MB', requested_phone_e164: '+905550669467' })
    const entry = { name: 'Lamia', phone: '+905550669467' }
    expect(planMbImport([entry], [existing])).toEqual([{ kind: 'lock-existing', entry, profile: existing }])
  })

  it('holds a same-name profile on another phone for review instead of creating it', () => {
    const plan = planMbImport([{ name: 'Omar', phone: '+905534695341' }], [profile({ full_name: 'omar ' })])
    expect(plan.map((a) => a.kind)).toEqual(['review'])
  })

  it('never locks or duplicates an admin', () => {
    const admin = profile({ role: 'ADMIN', requested_phone_e164: '+905550669467' })
    expect(planMbImport([{ name: 'Lamia', phone: '+905550669467' }], [admin]).map((a) => a.kind)).toEqual(['review'])
  })

  it('ignores former profiles and repeated sheet rows', () => {
    const plan = planMbImport(
      [
        { name: 'Sofia', phone: '+905550669287' },
        { name: 'sofia', phone: '+905550669287' },
      ],
      [profile({ full_name: 'Sofia', status: 'former', requested_phone_e164: '+905550669287' })],
    )
    expect(plan.map((a) => a.kind)).toEqual(['create'])
  })
})
