// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  signInWithPassword: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: (_url: string, key: string) => key === 'service'
    ? { from: () => ({ select: mocks.select }) }
    : { auth: { signInWithPassword: mocks.signInWithPassword } },
}))

import handler from '../../api/auth/login-phone'

const req = (phone: string, password = 'password') => ({ method: 'POST', body: { phone, password } })
const response = () => { const res = { status: vi.fn(), json: vi.fn() }; res.status.mockReturnValue(res); return res }

describe('phone login endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service')
    mocks.select.mockReturnValue({ eq: () => ({ limit: vi.fn().mockResolvedValue({ data: [{ email: 'sales@example.test' }], error: null }) }) })
    mocks.signInWithPassword.mockResolvedValue({ data: { session: { access_token: 'access', refresh_token: 'refresh' } }, error: null })
  })

  it('signs in by normalized profile phone without exposing the matched email', async () => {
    const res = response()
    await handler(req('+90 555 111 22 33'), res)
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: 'sales@example.test', password: 'password' })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ access_token: 'access', refresh_token: 'refresh' })
  })

  it('rejects duplicate phone matches before attempting auth', async () => {
    mocks.select.mockReturnValue({ eq: () => ({ limit: vi.fn().mockResolvedValue({ data: [{ email: 'one@example.test' }, { email: 'two@example.test' }], error: null }) }) })
    const res = response()
    await handler(req('+905551112233'), res)
    expect(mocks.signInWithPassword).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid phone number or password.' })
  })

  it('keeps password failures generic', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { session: null }, error: { message: 'Invalid login credentials' } })
    const res = response()
    await handler(req('+905551112233'), res)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid phone number or password.' })
  })
})
