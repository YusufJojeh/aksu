import type { VercelRequest, VercelResponse } from '@vercel/node'
import { get } from '@vercel/blob'
import { requireAdmin } from '../../../_lib/auth.js'
import { getSql } from '../../../_lib/db.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return

  const { id } = req.query
  if (typeof id !== 'string') {
    res.status(400).json({ error: 'invalid_id' })
    return
  }

  try {
    const sql = getSql()
    const rows = await sql`select blob_pathname from reports where id = ${id} limit 1`
    const row = rows[0] as { blob_pathname: string } | undefined
    if (!row) {
      res.status(404).json({ error: 'not_found' })
      return
    }

    const blob = await get(row.blob_pathname, { access: 'private' })
    if (!blob || blob.statusCode !== 200) {
      res.status(404).json({ error: 'file_not_found' })
      return
    }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${id}.pdf"`)
    const reader = blob.stream.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(value)
    }
    res.end()
  } catch (error) {
    console.error('Failed to fetch report file', error)
    res.status(503).json({ error: 'storage_unavailable' })
  }
}
