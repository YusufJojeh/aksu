import { bodyObject, requireActiveUser, requireEnv, requirePost, serverClient, type ServerlessRequest, type ServerlessResponse } from '../_lib/http.js'
import { createHash } from 'node:crypto'
import { assertArchivedDocumentPdf, assertArchivedPdf, isArchivedDocumentKind } from '../../src/lib/pdfIntegrity.js'

// Re-hashes an object the caller just uploaded to their own archive prefix and records the hash.
// finalize_report() and the employee_documents insert policy only accept hashes recorded here.
export default async function handler(req: ServerlessRequest, res: ServerlessResponse): Promise<void> {
  if (!requirePost(req, res)) return
  const user = await requireActiveUser(req, res)
  if (!user) return

  const body = bodyObject(req)
  const storageKey = typeof body.storageKey === 'string' ? body.storageKey : ''
  const documentKind = body.documentKind
  if (documentKind !== undefined && !isArchivedDocumentKind(documentKind)) { res.status(400).json({ error: 'invalid_document_kind' }); return }
  const ownKeyRe = documentKind
    ? new RegExp(`^${user.userId}/documents/[0-9a-f-]{36}\\.pdf$`)
    : new RegExp(`^${user.userId}/[0-9a-f-]{36}\\.pdf$`)
  if (!ownKeyRe.test(storageKey)) { res.status(400).json({ error: 'invalid_storage_key' }); return }

  const service = serverClient(user.url, requireEnv('SUPABASE_SERVICE_ROLE_KEY'))
  const download = await service.storage.from('report-pdfs').download(storageKey)
  if (download.error || !download.data) { res.status(404).json({ error: 'object_not_found' }); return }

  const bytes = new Uint8Array(await download.data.arrayBuffer())
  try {
    await (documentKind ? assertArchivedDocumentPdf(bytes, documentKind) : assertArchivedPdf(bytes))
  } catch {
    res.status(422).json({
      error: documentKind
        ? 'Upload a complete document PDF. Blank or malformed files cannot be archived.'
        : 'Upload a complete five-page treatment PDF. Blank or malformed files cannot be finalized.',
      code: 'pdf_incomplete',
    })
    return
  }
  const sha256 = createHash('sha256').update(bytes).digest('hex')

  const { error: upsertError } = await service
    .from('report_pdf_checksums')
    .upsert({ storage_key: storageKey, pdf_sha256: sha256, verified_at: new Date().toISOString() })
  if (upsertError) { res.status(500).json({ error: 'checksum_write_failed' }); return }

  res.status(200).json({ sha256 })
}
