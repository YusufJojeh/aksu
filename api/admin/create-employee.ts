import { randomUUID } from 'node:crypto'
import {
  bodyObject,
  requireAdmin,
  requireEnv,
  requirePost,
  serverClient,
  type ServerlessRequest,
  type ServerlessResponse,
} from '../_lib/http.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\+[1-9][0-9]{6,14}$/

// Admins create sales accounts directly; nothing is emailed and there is no self-registration. Sales staff sign in
// by phone alone (employee-login), so the account is active at once and its password is a random value nobody
// knows. Email is optional: without one the account gets an internal placeholder address, like public-sales ones.
export default async function handler(req: ServerlessRequest, res: ServerlessResponse): Promise<void> {
  if (!requirePost(req, res)) return
  const admin = await requireAdmin(req, res)
  if (!admin) return

  const body = bodyObject(req)
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
  const workPhoneE164 = typeof body.workPhoneE164 === 'string' ? body.workPhoneE164 : ''
  const givenEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const valid =
    fullName.length >= 2 &&
    fullName.length <= 120 &&
    PHONE_RE.test(workPhoneE164) &&
    (givenEmail === '' || (givenEmail.length <= 254 && EMAIL_RE.test(givenEmail)))
  if (!valid) {
    res.status(400).json({ error: 'invalid_body' })
    return
  }

  const service = serverClient(admin.url, requireEnv('SUPABASE_SERVICE_ROLE_KEY'))
  // The phone is the sign-in identity, so it may belong to at most one live profile.
  const { data: taken, error: lookupError } = await service
    .from('profiles')
    .select('id')
    .eq('requested_phone_e164', workPhoneE164)
    .in('status', ['pending', 'active'])
    .limit(1)
  if (lookupError) {
    console.error('create-employee lookup failed', lookupError)
    res.status(500).json({ error: 'create_failed' })
    return
  }
  if (taken.length > 0) {
    res.status(409).json({ error: 'phone_already_registered' })
    return
  }

  const { data, error } = await service.auth.admin.createUser({
    email: givenEmail || `sales-${randomUUID()}@pdfbuilder.local`,
    password: `${randomUUID()}${randomUUID()}`,
    email_confirm: true,
    user_metadata: { full_name: fullName, work_phone_e164: workPhoneE164 },
  })
  if (error || !data.user) {
    console.error('create-employee failed', error)
    // Raw provider messages are not shown to the client; only the one actionable case is surfaced.
    const emailTaken =
      error?.status === 422 || /already.*registered|already been registered|email_exists/i.test(error?.message ?? '')
    res.status(emailTaken ? 409 : 400).json({ error: emailTaken ? 'email_already_registered' : 'create_failed' })
    return
  }

  // handle_new_user inserted a pending SALES profile; an admin-created account starts active.
  const { error: activateError } = await service.from('profiles').update({ status: 'active' }).eq('id', data.user.id)
  if (activateError) {
    console.error('create-employee activation failed', activateError)
    await service.auth.admin.deleteUser(data.user.id)
    res.status(500).json({ error: 'create_failed' })
    return
  }
  res.status(201).json({ id: data.user.id })
}
