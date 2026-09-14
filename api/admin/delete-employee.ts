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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
  const employeeId = typeof body.employeeId === 'string' ? body.employeeId : ''
  if (!UUID_RE.test(employeeId)) { res.status(400).json({ error: 'invalid_body' }); return }
  if (employeeId === authData.user.id) { res.status(400).json({ error: 'cannot_delete_self' }); return }

  const service = createClient(url, requireEnv('SUPABASE_SERVICE_ROLE_KEY'))

  // profiles rows are referenced with `on delete restrict` from reports, report_events, and
  // channel_assignments, so this delete only succeeds when the employee has left no history at
  // all — exactly the "hard delete only if truly unused" guarantee, enforced by Postgres itself
  // rather than reimplemented here.
  const deleted = await service.from('profiles').delete().eq('id', employeeId).select('id')
  if (deleted.error) {
    if (deleted.error.code === '23503') { res.status(409).json({ error: 'employee_has_history' }); return }
    res.status(500).json({ error: 'delete_failed' }); return
  }
  if (!deleted.data || deleted.data.length === 0) { res.status(404).json({ error: 'not_found' }); return }

  const authDelete = await service.auth.admin.deleteUser(employeeId)
  if (authDelete.error) { res.status(500).json({ error: 'profile_deleted_auth_delete_failed' }); return }

  res.status(200).json({ ok: true })
}
