import { bodyObject, requireAdmin, requireEnv, requirePost, serverClient, type ServerlessRequest, type ServerlessResponse } from '../_lib/http.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function handler(req: ServerlessRequest, res: ServerlessResponse): Promise<void> {
  if (!requirePost(req, res)) return
  const admin = await requireAdmin(req, res)
  if (!admin) return

  const employeeId = typeof bodyObject(req).employeeId === 'string' ? bodyObject(req).employeeId as string : ''
  if (!UUID_RE.test(employeeId)) { res.status(400).json({ error: 'invalid_body' }); return }
  if (employeeId === admin.userId) { res.status(400).json({ error: 'cannot_delete_self' }); return }

  const service = serverClient(admin.url, requireEnv('SUPABASE_SERVICE_ROLE_KEY'))

  // One admin must not be able to remove another admin's account through this endpoint.
  const target = await service.from('profiles').select('role').eq('id', employeeId).maybeSingle()
  if (target.error) { console.error('delete-employee lookup failed', target.error); res.status(500).json({ error: 'delete_failed' }); return }
  if (!target.data) { res.status(404).json({ error: 'not_found' }); return }
  if (target.data.role === 'ADMIN') { res.status(403).json({ error: 'cannot_delete_admin' }); return }

  // profiles rows are referenced with `on delete restrict` from reports, report_events, and
  // channel_assignments, so this delete only succeeds when the employee has left no history at
  // all — exactly the "hard delete only if truly unused" guarantee, enforced by Postgres itself
  // rather than reimplemented here.
  const deleted = await service.from('profiles').delete().eq('id', employeeId).select('id')
  if (deleted.error) {
    if (deleted.error.code === '23503') { res.status(409).json({ error: 'employee_has_history' }); return }
    console.error('delete-employee failed', deleted.error)
    res.status(500).json({ error: 'delete_failed' }); return
  }
  if (!deleted.data || deleted.data.length === 0) { res.status(404).json({ error: 'not_found' }); return }

  const authDelete = await service.auth.admin.deleteUser(employeeId)
  if (authDelete.error) { console.error('delete-employee auth delete failed', authDelete.error); res.status(500).json({ error: 'profile_deleted_auth_delete_failed' }); return }

  res.status(200).json({ ok: true })
}
