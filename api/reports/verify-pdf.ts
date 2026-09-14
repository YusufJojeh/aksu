import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { assertArchivedPdf } from '../../src/lib/pdfIntegrity.js'

interface ServerlessRequest {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body?: unknown
}

interface ServerlessResponse {
  status(code: number): ServerlessResponse
  json(body: unknown): void
}

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

  const { data: profile } = await anon.from('profiles').select('status').eq('id', authData.user.id).single()
  if (profile?.status !== 'active') { res.status(403).json({ error: 'active_account_required' }); return }

  const body = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as Record<string, unknown>
  const storageKey = typeof body.storageKey === 'string' ? body.storageKey : ''
  const ownKeyRe = new RegExp(`^${authData.user.id}/[0-9a-f-]{36}\\.pdf$`)
  if (!ownKeyRe.test(storageKey)) { res.status(400).json({ error: 'invalid_storage_key' }); return }

  const service = createClient(url, requireEnv('SUPABASE_SERVICE_ROLE_KEY'))
  const download = await service.storage.from('report-pdfs').download(storageKey)
  if (download.error || !download.data) { res.status(404).json({ error: 'object_not_found' }); return }

  const bytes = new Uint8Array(await download.data.arrayBuffer())
  try {
    await assertArchivedPdf(bytes)
  } catch {
    res.status(422).json({ error: 'Upload a complete five-page treatment PDF. Blank or malformed files cannot be finalized.' })
    return
  }
  const sha256 = createHash('sha256').update(bytes).digest('hex')

  const { error: upsertError } = await service
    .from('report_pdf_checksums')
    .upsert({ storage_key: storageKey, pdf_sha256: sha256, verified_at: new Date().toISOString() })
  if (upsertError) { res.status(500).json({ error: 'checksum_write_failed' }); return }

  res.status(200).json({ sha256 })
}
