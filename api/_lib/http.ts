import { createClient } from '@supabase/supabase-js'

export interface ServerlessRequest {
  method?: string
  headers?: Record<string, string | string[] | undefined>
  body?: unknown
}

export interface ServerlessResponse {
  status(code: number): ServerlessResponse
  json(body: unknown): void
}

export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}

/** Supabase env for handlers that report a missing configuration as a 500 instead of throwing. */
export function supabaseEnv(): { url: string; anonKey: string; serviceKey: string } | null {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && anonKey && serviceKey ? { url, anonKey, serviceKey } : null
}

const SERVER_AUTH = { persistSession: false, autoRefreshToken: false } as const

/** A stateless client for server use: no session persistence or token refresh between requests. */
export function serverClient(url: string, key: string, token?: string) {
  return createClient(url, key, {
    auth: SERVER_AUTH,
    ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}),
  })
}

export function bodyObject(req: { body?: unknown }): Record<string, unknown> {
  return typeof req.body === 'object' && req.body !== null ? req.body as Record<string, unknown> : {}
}

export function requirePost(req: ServerlessRequest, res: ServerlessResponse): boolean {
  if (req.method === 'POST') return true
  res.status(405).json({ error: 'method_not_allowed' })
  return false
}

function bearerToken(req: ServerlessRequest): string | undefined {
  const header = req.headers?.authorization
  const authorization = Array.isArray(header) ? header[0] : header
  return authorization?.replace(/^Bearer /, '') || undefined
}

/**
 * Verifies the bearer token belongs to an active account (and, with `role`, that role). On failure
 * the response has already been sent and null is returned.
 */
export async function requireActiveUser(req: ServerlessRequest, res: ServerlessResponse, role?: 'ADMIN'): Promise<{ userId: string; url: string } | null> {
  const token = bearerToken(req)
  if (!token) { res.status(401).json({ error: 'unauthorized' }); return null }

  const url = requireEnv('SUPABASE_URL')
  const anon = serverClient(url, requireEnv('SUPABASE_ANON_KEY'), token)
  const { data: authData, error: authError } = await anon.auth.getUser(token)
  if (authError || !authData.user) { res.status(401).json({ error: 'unauthorized' }); return null }

  const { data: profile } = await anon.from('profiles').select('role,status').eq('id', authData.user.id).single()
  if (role && (profile?.role !== role || profile.status !== 'active')) { res.status(403).json({ error: 'admin_required' }); return null }
  if (profile?.status !== 'active') { res.status(403).json({ error: 'active_account_required' }); return null }
  return { userId: authData.user.id, url }
}

/** Active ADMIN only; see requireActiveUser. */
export function requireAdmin(req: ServerlessRequest, res: ServerlessResponse) {
  return requireActiveUser(req, res, 'ADMIN')
}
