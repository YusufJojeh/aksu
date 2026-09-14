import { createClient } from '@supabase/supabase-js'
import { normalizePhone } from '../../src/lib/phone.js'

interface ServerlessRequest {
  method?: string
  body?: unknown
}

interface ServerlessResponse {
  status(code: number): ServerlessResponse
  json(payload: unknown): void
}

const AUTH_FAILED = 'Invalid phone number or password.'

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return }
  const body = req.body as { phone?: unknown; password?: unknown }
  const phone = typeof body.phone === 'string' ? normalizePhone(body.phone) : undefined
  const password = typeof body.password === 'string' ? body.password : ''
  if (!phone || password.length < 1) { res.status(400).json({ error: AUTH_FAILED }); return }

  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceKey) { res.status(500).json({ error: 'auth_not_configured' }); return }

  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: profiles, error: lookupError } = await service
    .from('profiles')
    .select('email')
    .eq('requested_phone_e164', phone)
    .limit(2)

  if (lookupError) { res.status(500).json({ error: 'phone_lookup_failed' }); return }
  if (!profiles || profiles.length !== 1) { res.status(401).json({ error: AUTH_FAILED }); return }

  const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await auth.auth.signInWithPassword({ email: profiles[0]!.email, password })
  if (error || !data.session) { res.status(401).json({ error: AUTH_FAILED }); return }

  res.status(200).json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  })
}
