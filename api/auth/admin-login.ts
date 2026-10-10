import {
  bodyObject,
  requirePost,
  serverClient,
  supabaseEnv,
  type ServerlessRequest,
  type ServerlessResponse,
} from '../_lib/http.js'

const AUTH_FAILED = 'Invalid email or password.'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Email + password is the administrator door only. Sales staff sign in with their phone number alone through
// employee-login, and there is no self-registration, so a non-admin email fails exactly like a wrong password and
// never gets a session from here.
export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (!requirePost(req, res)) return
  const body = bodyObject(req)
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' && body.password.length <= 1024 ? body.password : ''
  if (!EMAIL_RE.test(email) || email.length > 320 || password.length < 1) {
    res.status(400).json({ error: AUTH_FAILED, code: 'invalid_credentials' })
    return
  }

  const env = supabaseEnv()
  if (!env) {
    res.status(500).json({ error: 'auth_not_configured' })
    return
  }

  const service = serverClient(env.url, env.serviceKey)
  const { data: profiles, error: lookupError } = await service
    .from('profiles')
    .select('email,role')
    .eq('email', email)
    .limit(2)

  if (lookupError) {
    console.error('admin-login lookup failed', lookupError)
    res.status(500).json({ error: 'sign_in_failed' })
    return
  }
  if (!profiles || profiles.length !== 1 || profiles[0]!.role !== 'ADMIN') {
    res.status(401).json({ error: AUTH_FAILED, code: 'invalid_credentials' })
    return
  }

  const auth = serverClient(env.url, env.anonKey)
  const { data, error } = await auth.auth.signInWithPassword({ email: profiles[0]!.email, password })
  if (error || !data.session) {
    res.status(401).json({ error: AUTH_FAILED, code: 'invalid_credentials' })
    return
  }

  res.status(200).json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  })
}
