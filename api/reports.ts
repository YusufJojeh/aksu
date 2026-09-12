import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'node:crypto'
import { put } from '@vercel/blob'
import { z } from 'zod'
import { requireAdmin } from './_lib/auth.js'
import { getSql } from './_lib/db.js'

const clinicIdSchema = z.enum(['aksu', 'mb-dental'])

const submitSchema = z.object({
  employeeName: z.string().trim().min(1).max(200),
  clinicId: clinicIdSchema,
  locale: z.string().trim().min(2).max(5),
  patientName: z.string().trim().max(200).optional().default(''),
  pdfBase64: z.string().min(1),
})

const MAX_PDF_BYTES = 15 * 1024 * 1024

async function handleSubmit(req: VercelRequest, res: VercelResponse) {
  const parsed = submitSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() })
    return
  }
  const { employeeName, clinicId, locale, patientName, pdfBase64 } = parsed.data

  const bytes = Buffer.from(pdfBase64, 'base64')
  if (bytes.length === 0 || bytes.length > MAX_PDF_BYTES) {
    res.status(400).json({ error: 'invalid_pdf_size' })
    return
  }

  const id = randomUUID()
  try {
    const blob = await put(`reports/${clinicId}/${id}.pdf`, bytes, { access: 'private', contentType: 'application/pdf' })
    const sql = getSql()
    await sql`
      insert into reports (id, employee_name, clinic_id, locale, patient_name, blob_pathname, blob_url, created_at)
      values (${id}, ${employeeName}, ${clinicId}, ${locale}, ${patientName}, ${blob.pathname}, ${blob.url}, now())
    `
    res.status(201).json({ ok: true, id })
  } catch (error) {
    console.error('Failed to store report', error)
    res.status(503).json({ error: 'storage_unavailable' })
  }
}

const listQuerySchema = z.object({
  employeeName: z.string().trim().optional(),
  clinicId: clinicIdSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

async function handleList(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return

  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_query' })
    return
  }
  const { employeeName, clinicId, from, to, limit, offset } = parsed.data

  try {
    const sql = getSql()
    const reports = await sql`
      select id, employee_name, clinic_id, locale, patient_name, created_at
      from reports
      where (${employeeName ?? null}::text is null or employee_name ilike '%' || ${employeeName ?? ''} || '%')
        and (${clinicId ?? null}::text is null or clinic_id = ${clinicId ?? ''})
        and (${from ?? null}::text is null or created_at >= ${from ?? ''}::timestamptz)
        and (${to ?? null}::text is null or created_at <= ${to ?? ''}::timestamptz)
      order by created_at desc
      limit ${limit} offset ${offset}
    `
    res.status(200).json({ reports })
  } catch (error) {
    console.error('Failed to list reports', error)
    res.status(503).json({ error: 'storage_unavailable' })
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') return handleSubmit(req, res)
  if (req.method === 'GET') return handleList(req, res)
  res.status(405).json({ error: 'method_not_allowed' })
}
