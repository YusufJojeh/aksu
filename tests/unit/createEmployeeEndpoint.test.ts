// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  taken: vi.fn(),
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  activate: vi.fn(),
}))

vi.mock('../../api/_lib/http.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  requireAdmin: mocks.requireAdmin,
  serverClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ in: () => ({ limit: mocks.taken }) }) }),
      update: (patch: unknown) => ({ eq: (_column: string, id: string) => mocks.activate(patch, id) }),
    }),
    auth: { admin: { createUser: mocks.createUser, deleteUser: mocks.deleteUser } },
  }),
}))

import handler from '../../api/admin/create-employee'

const req = (body: Record<string, unknown>) => ({ method: 'POST', body })
const response = () => {
  const res = { status: vi.fn(), json: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

describe('admin create-employee endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service')
    mocks.requireAdmin.mockResolvedValue({ userId: 'admin', url: 'https://example.supabase.co' })
    mocks.taken.mockResolvedValue({ data: [], error: null })
    mocks.createUser.mockResolvedValue({ data: { user: { id: 'new-user' } }, error: null })
    mocks.activate.mockResolvedValue({ error: null })
  })

  it('creates an active sales account without sending an invitation', async () => {
    const res = response()
    await handler(req({ fullName: ' Ada Sales ', workPhoneE164: '+905551112233', email: '' }), res)
    const created = mocks.createUser.mock.calls[0]![0]
    expect(created.email).toMatch(/^sales-[0-9a-f-]{36}@pdfbuilder\.local$/)
    expect(created.email_confirm).toBe(true)
    expect(created.password.length).toBeGreaterThanOrEqual(64)
    expect(created.user_metadata).toEqual({ full_name: 'Ada Sales', work_phone_e164: '+905551112233' })
    expect(mocks.activate).toHaveBeenCalledWith({ status: 'active' }, 'new-user')
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('keeps a given email, normalized', async () => {
    await handler(req({ fullName: 'Ada', workPhoneE164: '+905551112233', email: ' Ada@Example.test ' }), response())
    expect(mocks.createUser.mock.calls[0]![0].email).toBe('ada@example.test')
  })

  it('refuses a phone that already signs in to a live profile', async () => {
    mocks.taken.mockResolvedValue({ data: [{ id: 'existing' }], error: null })
    const res = response()
    await handler(req({ fullName: 'Ada', workPhoneE164: '+905551112233' }), res)
    expect(mocks.createUser).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ error: 'phone_already_registered' })
  })

  it('rejects bad input before touching auth', async () => {
    for (const body of [
      { fullName: 'A', workPhoneE164: '+905551112233' },
      { fullName: 'Ada', workPhoneE164: '0555' },
      { fullName: 'Ada', workPhoneE164: '+905551112233', email: 'not-an-email' },
    ]) {
      const res = response()
      await handler(req(body), res)
      expect(res.status).toHaveBeenCalledWith(400)
    }
    expect(mocks.createUser).not.toHaveBeenCalled()
  })

  it('reports a taken email and rolls back when activation fails', async () => {
    mocks.createUser.mockResolvedValueOnce({ data: { user: null }, error: { status: 422, message: 'email_exists' } })
    const taken = response()
    await handler(req({ fullName: 'Ada', workPhoneE164: '+905551112233', email: 'ada@example.test' }), taken)
    expect(taken.json).toHaveBeenCalledWith({ error: 'email_already_registered' })

    mocks.activate.mockResolvedValue({ error: { message: 'boom' } })
    const failed = response()
    await handler(req({ fullName: 'Ada', workPhoneE164: '+905551112233' }), failed)
    expect(mocks.deleteUser).toHaveBeenCalledWith('new-user')
    expect(failed.status).toHaveBeenCalledWith(500)
  })

  it('does nothing for non-admins', async () => {
    mocks.requireAdmin.mockResolvedValue(null)
    await handler(req({ fullName: 'Ada', workPhoneE164: '+905551112233' }), response())
    expect(mocks.taken).not.toHaveBeenCalled()
    expect(mocks.createUser).not.toHaveBeenCalled()
  })
})
