import { createClient } from '@supabase/supabase-js'
import { createHash, randomUUID } from 'node:crypto'
import { reportSchema, type ReportData } from '../../src/domain/report.js'
import { visitTotalMinor } from '../../src/domain/calculations.js'
import { assertArchivedPdf } from '../../src/lib/pdfIntegrity.js'
import { normalizePhone } from '../../src/lib/phone.js'

interface ServerlessRequest {
  method?: string
  body?: unknown
}

interface ServerlessResponse {
  status(code: number): ServerlessResponse
  json(body: unknown): void
}

interface ProfileRow {
  id: string
  full_name: string
  email: string
  role: 'ADMIN' | 'SALES'
  status: 'pending' | 'active' | 'suspended' | 'former'
  requested_phone_e164: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// Matches the 15 MB bucket limit; base64 inflates bytes by 4/3.
const MAX_PDF_BYTES = 15 * 1024 * 1024
const MAX_PDF_BASE64_CHARS = Math.ceil(MAX_PDF_BYTES / 3) * 4 + 64

/** Errors whose message is safe to show to the (unauthenticated) caller. Everything else is logged and hidden. */
class PublicError extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}

function createServiceClient() {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'))
}

// Derived from a real call: the bare `ReturnType<typeof createClient>` resolves the schema generics to `never`.
type ServiceClient = ReturnType<typeof createServiceClient>

function canonicalName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

function decodePdfBase64(value: string): Uint8Array {
  const normalized = value.replace(/^data:application\/pdf;base64,/, '')
  return new Uint8Array(Buffer.from(normalized, 'base64'))
}

async function ensureSalesProfile(service: ServiceClient, fullName: string, phone: string): Promise<ProfileRow> {
  const { data, error } = await service
    .from('profiles')
    .select('id,full_name,email,role,status,requested_phone_e164')
    .eq('requested_phone_e164', phone)
    .order('created_at', { ascending: true })
  if (error) throw error

  // This endpoint is intentionally reachable without a Supabase session (a sales rep
  // self-identifies by name + phone before ever logging in), so an existing profile match
  // must never be authenticated here. Only a profile that is already 'active' may be reused;
  // an unauthenticated caller must not be able to flip a pending/suspended/former profile to
  // active or overwrite its name/phone, since name + work phone are guessable/public and doing
  // so would let anyone impersonate or hijack another employee's account.
  //
  // The phone is the identity: a differently spelled name with a known phone is the same person,
  // so it must reuse that profile rather than create a duplicate. Prefer an exact-name active match,
  // then the oldest active profile on that phone.
  const profiles = (data as ProfileRow[] | null) ?? []
  const active = profiles.filter((profile) => profile.status === 'active')
  const match = active.find((profile) => canonicalName(profile.full_name) === canonicalName(fullName)) ?? active[0]
  if (match) return match
  if (profiles.length > 0) throw new PublicError('This sales profile is not active.', 403)

  const id = randomUUID()
  const email = `public-sales-${id}@pdfbuilder.local`
  const password = `${randomUUID()}${randomUUID()}`
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName.trim(), work_phone_e164: phone },
  })
  if (createError || !created.user) throw createError ?? new Error('Could not create sales profile.')
  const { data: profile, error: profileError } = await service
    .from('profiles')
    .update({ full_name: fullName.trim(), role: 'SALES', status: 'active', requested_phone_e164: phone })
    .eq('id', created.user.id)
    .select('id,full_name,email,role,status,requested_phone_e164')
    .single()
  if (profileError) throw profileError
  return profile as ProfileRow
}

async function findOrAssignChannel(service: ServiceClient, profileId: string): Promise<{ channelId: string | null; phone: string | null }> {
  const { data: assignments } = await service
    .from('channel_assignments')
    .select('channel_id')
    .eq('employee_id', profileId)
    .is('unassigned_at', null)
    .limit(1)
  const assignedChannelId = Array.isArray(assignments) && assignments[0]?.channel_id ? String(assignments[0].channel_id) : ''
  if (assignedChannelId) {
    const { data: channel } = await service
      .from('communication_channels')
      .select('id,phone_e164,status')
      .eq('id', assignedChannelId)
      .eq('status', 'active')
      .maybeSingle()
    if (channel?.id) return { channelId: String(channel.id), phone: String(channel.phone_e164) }
  }

  const { data: channels } = await service
    .from('communication_channels')
    .select('id,phone_e164')
    .eq('status', 'active')
    .order('created_at', { ascending: true })
  const { data: activeAssignments } = await service
    .from('channel_assignments')
    .select('channel_id')
    .is('unassigned_at', null)
  const assigned = new Set((activeAssignments ?? []).map((assignment: { channel_id: string }) => assignment.channel_id))
  const free = (channels ?? []).find((channel: { id: string }) => !assigned.has(channel.id))
  if (!free) return { channelId: null, phone: null }

  const { error } = await service
    .from('channel_assignments')
    .insert({ channel_id: free.id, employee_id: profileId, assigned_by: profileId })
  if (error) return { channelId: null, phone: null }
  return { channelId: String(free.id), phone: String(free.phone_e164) }
}

export default async function handler(req: ServerlessRequest, res: ServerlessResponse): Promise<void> {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return }

  try {
    const body = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as Record<string, unknown>
    const parsed = reportSchema.safeParse(body.report)
    const salesName = typeof body.salesName === 'string' ? body.salesName.trim() : ''
    const salesPhone = normalizePhone(typeof body.salesPhone === 'string' ? body.salesPhone : '')
    const pdfBase64 = typeof body.pdfBase64 === 'string' ? body.pdfBase64 : ''
    const parentReportId = typeof body.parentReportId === 'string' && body.parentReportId ? body.parentReportId : null
    if (!parsed.success || salesName.length < 2 || salesName.length > 120 || !salesPhone || !pdfBase64) {
      res.status(400).json({ error: 'Enter a valid sales name, sales phone, and report.' })
      return
    }
    if (pdfBase64.length > MAX_PDF_BASE64_CHARS) { res.status(413).json({ error: 'The PDF is too large.' }); return }
    if (parentReportId && !UUID_RE.test(parentReportId)) { res.status(400).json({ error: 'Invalid parent report.' }); return }

    const report: ReportData = parsed.data
    const bytes = decodePdfBase64(pdfBase64)
    if (bytes.length > MAX_PDF_BYTES) { res.status(413).json({ error: 'The PDF is too large.' }); return }
    try { await assertArchivedPdf(bytes) } catch { throw new PublicError('The report PDF is incomplete or damaged.', 422) }

    const service = createServiceClient()
    const profile = await ensureSalesProfile(service, salesName, salesPhone)
    const id = randomUUID()
    const storageKey = `${profile.id}/${id}.pdf`
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    const upload = await service.storage.from('report-pdfs').upload(storageKey, new Blob([Uint8Array.from(bytes)], { type: 'application/pdf' }), { contentType: 'application/pdf', upsert: false })
    if (upload.error) throw upload.error

    const cleanup = async () => { await service.storage.from('report-pdfs').remove([storageKey]) }
    try {
      const checksum = await service
        .from('report_pdf_checksums')
        .upsert({ storage_key: storageKey, pdf_sha256: sha256, verified_at: new Date().toISOString() })
      if (checksum.error) throw checksum.error

      // A report can only be an edit of one of the same employee's own reports.
      const parent = parentReportId
        ? await service.from('reports').select('id').eq('id', parentReportId).eq('created_by_employee_id', profile.id).maybeSingle()
        : { data: null }
      if (parentReportId && !parent.data) throw new PublicError('The report being edited could not be found.', 400)
      const channel = await findOrAssignChannel(service, profile.id)
      const patientIdentifier = report.clinicId === 'mb-dental' ? report.patient.patientId : ''
      const patientPhone = normalizePhone(report.patient.phone) ?? report.patient.phone.trim()
      const insert = await service
        .from('reports')
        .insert({
          id,
          created_by_employee_id: profile.id,
          clinic_id: report.clinicId,
          document_locale: report.document.locale,
          currency: report.document.currency,
          patient_name: report.patient.name.trim(),
          patient_phone: patientPhone,
          patient_identifier: patientIdentifier.trim() || null,
          report_payload: report,
          first_visit_total_minor: visitTotalMinor(report.firstVisit.treatmentRows),
          second_visit_total_minor: visitTotalMinor(report.secondVisit.treatmentRows),
          employee_name_snapshot: profile.full_name,
          employee_phone_snapshot: channel.phone ?? profile.requested_phone_e164,
          communication_channel_id: channel.channelId,
          template_version: `${report.clinicId}:${report.document.locale}:2026-09`,
          pdf_storage_key: storageKey,
          pdf_sha256: sha256,
          parent_report_id: parent.data?.id ?? null,
        })
        .select('*')
        .single()
      if (insert.error) throw insert.error
      const eventRows = [
        { report_id: id, actor_id: profile.id, event_type: 'finalized' },
        ...(parent.data?.id ? [{ report_id: id, actor_id: profile.id, event_type: 'duplicated' }] : []),
      ]
      const events = await service.from('report_events').insert(eventRows)
      if (events.error) throw events.error
      res.status(201).json({ report: insert.data })
    } catch (error) {
      await cleanup()
      throw error
    }
  } catch (error) {
    if (error instanceof PublicError) { res.status(error.status).json({ error: error.message }); return }
    console.error('finalize-public failed', error)
    res.status(500).json({ error: 'Could not finalize report. Please try again.' })
  }
}
