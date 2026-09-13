import { createClient } from '@supabase/supabase-js'

interface ServerlessRequest {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body?: unknown
}

interface ServerlessResponse {
  status(code: number): ServerlessResponse
  json(body: unknown): void
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\+[1-9][0-9]{6,14}$/

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}

export default async function handler(req: ServerlessRequest, res: ServerlessResponse): Promise<void> {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return }

  const authHeader = req.headers.authorization
  const authorization = Array.isArray(authHeader) ? authHeader[0] : authHeader
  const token = authorization?.replace(/^Bearer /, '')
  if (!token) { res.status(401).json({ error: 'unauthorized' }); return }

  const url = requireEnv('SUPABASE_URL')
  const anon = createClient(url, requireEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: authData, error: authError } = await anon.auth.getUser(token)
  if (authError || !authData.user) { res.status(401).json({ error: 'unauthorized' }); return }

  const { data: profile } = await anon.from('profiles').select('role,status').eq('id', authData.user.id).single()
  if (profile?.role !== 'ADMIN' || profile.status !== 'active') { res.status(403).json({ error: 'admin_required' }); return }

  const body = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as Record<string, unknown>
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
  const workPhoneE164 = typeof body.workPhoneE164 === 'string' ? body.workPhoneE164 : ''
  const valid = EMAIL_RE.test(email) && fullName.length >= 2 && fullName.length <= 120 && PHONE_RE.test(workPhoneE164)
  if (!valid) { res.status(400).json({ error: 'invalid_body' }); return }

  const service = createClient(url, requireEnv('SUPABASE_SERVICE_ROLE_KEY'))
  const { data, error } = await service.auth.admin.inviteUserByEmail(email.toLowerCase(), {
    data: { full_name: fullName, work_phone_e164: workPhoneE164 },
  })
  if (error || !data.user) { res.status(400).json({ error: error?.message ?? 'invite_failed' }); return }
  res.status(201).json({ id: data.user.id })
}
