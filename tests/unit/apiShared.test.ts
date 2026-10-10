// @vitest-environment node
import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { bodyObject, requirePost } from '../../api/_lib/http'
import { E164_HINT, bytesToBase64, optionalE164, requireE164, sha256Hex } from '../../src/lib/api/shared'

vi.mock('../../src/lib/supabase', () => ({ requireSupabase: () => ({}) }))

function fakeResponse() {
  const res = {
    code: 0,
    body: undefined as unknown,
    status(code: number) {
      res.code = code
      return res
    },
    json(body: unknown) {
      res.body = body
    },
  }
  return res
}

describe('client data-layer helpers', () => {
  it('normalizes or rejects E.164 phones with one shared message', () => {
    expect(requireE164('+90 555 111 22 33')).toBe('+905551112233')
    expect(() => requireE164('12')).toThrow(E164_HINT)
  })

  it('treats a blank optional phone as cleared and still validates a filled one', () => {
    expect(optionalE164(undefined)).toBeNull()
    expect(optionalE164('   ')).toBeNull()
    expect(optionalE164('+905551112233')).toBe('+905551112233')
    expect(() => optionalE164('abc')).toThrow(E164_HINT)
  })

  it('hashes and encodes bytes like Node does', async () => {
    const bytes = new TextEncoder().encode('proof')
    expect(await sha256Hex(bytes)).toBe(createHash('sha256').update(bytes).digest('hex'))
    expect(bytesToBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'))
  })
})

describe('serverless http helpers', () => {
  it('rejects non-POST requests with 405', () => {
    const res = fakeResponse()
    expect(requirePost({ method: 'GET' }, res)).toBe(false)
    expect(res.code).toBe(405)
    expect(res.body).toEqual({ error: 'method_not_allowed' })
    expect(requirePost({ method: 'POST' }, fakeResponse())).toBe(true)
  })

  it('only accepts object bodies', () => {
    expect(bodyObject({ body: { a: 1 } })).toEqual({ a: 1 })
    expect(bodyObject({ body: 'text' })).toEqual({})
    expect(bodyObject({ body: null })).toEqual({})
  })
})
