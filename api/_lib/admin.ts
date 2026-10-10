import { createClient } from '@supabase/supabase-js'

export interface ServerlessRequest {
  method?: string
  headers: Record<string, string | string[] | undefined>
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

export function bodyObject(req: { body?: unknown }): Record<string, unknown> {
  return typeof req.body === 'object' && req.body !== null ? req.body as Record<string, unknown> : {}
}

/**
 * Verifies the bearer token belongs to an active ADMIN. On failure the response has already been
 * sent and null is returned; on success returns the admin's id and the Supabase URL.
 */
export async function requireAdmin(req: ServerlessRequest, res: ServerlessResponse): Promise<{ userId: string; url: string } | null> {
  const authHeader = req.headers.authorization
  const authorization = Array.isArray(authHeader) ? authHeader[0] : authHeader
  const token = authorization?.replace(/^Bearer /, '')
  if (!token) { res.status(401).json({ error: 'unauthorized' }); return null }

  const url = requireEnv('SUPABASE_URL')
  const anon = createClient(url, requireEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: authData, error: authError } = await anon.auth.getUser(token)
  if (authError || !authData.user) { res.status(401).json({ error: 'unauthorized' }); return null }

  const { data: profile } = await anon.from('profiles').select('role,status').eq('id', authData.user.id).single()
  if (profile?.role !== 'ADMIN' || profile.status !== 'active') { res.status(403).json({ error: 'admin_required' }); return null }
  return { userId: authData.user.id, url }
}
