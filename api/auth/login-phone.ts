import { bodyObject, requirePost, serverClient, supabaseEnv, type ServerlessRequest, type ServerlessResponse } from '../_lib/http.js'
import { normalizePhone } from '../../src/lib/phone.js'

const AUTH_FAILED = 'Invalid phone number or password.'

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (!requirePost(req, res)) return
  const body = bodyObject(req)
  const phone = typeof body.phone === 'string' ? normalizePhone(body.phone) : undefined
  const password = typeof body.password === 'string' && body.password.length <= 1024 ? body.password : ''
  if (!phone || password.length < 1) { res.status(400).json({ error: AUTH_FAILED, code: 'invalid_credentials' }); return }

  const env = supabaseEnv()
  if (!env) { res.status(500).json({ error: 'auth_not_configured' }); return }

  const service = serverClient(env.url, env.serviceKey)
  const { data: profiles, error: lookupError } = await service
    .from('profiles')
    .select('email')
    .eq('requested_phone_e164', phone)
    .limit(2)

  if (lookupError) { console.error('login-phone lookup failed', lookupError); res.status(500).json({ error: 'phone_lookup_failed' }); return }
  if (!profiles || profiles.length !== 1) { res.status(401).json({ error: AUTH_FAILED, code: 'invalid_credentials' }); return }

  const auth = serverClient(env.url, env.anonKey)
  const { data, error } = await auth.auth.signInWithPassword({ email: profiles[0]!.email, password })
  if (error || !data.session) { res.status(401).json({ error: AUTH_FAILED, code: 'invalid_credentials' }); return }

  res.status(200).json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  })
}
