import { describe, expect, it } from 'vitest'
import { reportFilename, sanitizeFilenamePart } from '../../src/lib/filename'

describe('filename sanitizer', () => {
  it('removes unsafe characters and never includes phone data', () => {
    expect(sanitizeFilenamePart('Adrian / Jacek:*?')).toBe('Adrian_Jacek')
    expect(reportFilename('Adrian Jacek', '2026-08-22', 'en')).toBe('Doctor-Aksu-Treatment-Plan_Adrian_Jacek_2026-08-22_EN.pdf')
  })
  it('preserves international patient names', () => expect(sanitizeFilenamePart('محمد يوسف')).toBe('محمد_يوسف'))
})
