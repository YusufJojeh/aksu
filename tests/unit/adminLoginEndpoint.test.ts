// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  eq: vi.fn(),
  signInWithPassword: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: (_url: string, key: string) =>
    key === 'service'
      ? { from: () => ({ select: mocks.select }) }
      : { auth: { signInWithPassword: mocks.signInWithPassword } },
}))

import handler from '../../api/auth/admin-login'

const AUTH_FAILED = { error: 'Invalid email or password.', code: 'invalid_credentials' }
const req = (email: string, password = 'password') => ({ method: 'POST', body: { email, password } })
const response = () => {
  const res = { status: vi.fn(), json: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}
const profilesFound = (data: Array<{ email: string; role: string }>) => {
  mocks.eq.mockReturnValue({ limit: vi.fn().mockResolvedValue({ data, error: null }) })
  mocks.select.mockReturnValue({ eq: mocks.eq })
}

describe('admin email login endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service')
    profilesFound([{ email: 'admin@example.test', role: 'ADMIN' }])
    mocks.signInWithPassword.mockResolvedValue({
      data: { session: { access_token: 'access', refresh_token: 'refresh' } },
      error: null,
    })
  })

  it('signs an administrator in by normalized email', async () => {
    const res = response()
    await handler(req('  Admin@Example.test '), res)
    expect(mocks.eq).toHaveBeenCalledWith('email', 'admin@example.test')
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: 'admin@example.test', password: 'password' })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ access_token: 'access', refresh_token: 'refresh' })
  })

  it('refuses non-admin profiles before attempting auth, with the same generic answer', async () => {
    profilesFound([{ email: 'sales@example.test', role: 'SALES' }])
    const res = response()
    await handler(req('sales@example.test'), res)
    expect(mocks.signInWithPassword).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(AUTH_FAILED)
  })

  it('rejects phone numbers and malformed input without a lookup', async () => {
    const res = response()
    await handler(req('+905551112233'), res)
    expect(mocks.select).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(AUTH_FAILED)
  })

  it('keeps password failures generic', async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    })
    const res = response()
    await handler(req('admin@example.test'), res)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(AUTH_FAILED)
  })
})
