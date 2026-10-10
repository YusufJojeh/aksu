import { bodyObject, requireAdmin, requireEnv, requirePost, serverClient, type ServerlessRequest, type ServerlessResponse } from '../_lib/http.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\+[1-9][0-9]{6,14}$/

export default async function handler(req: ServerlessRequest, res: ServerlessResponse): Promise<void> {
  if (!requirePost(req, res)) return
  const admin = await requireAdmin(req, res)
  if (!admin) return

  const body = bodyObject(req)
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
  const workPhoneE164 = typeof body.workPhoneE164 === 'string' ? body.workPhoneE164 : ''
  const valid = email.length <= 254 && EMAIL_RE.test(email) && fullName.length >= 2 && fullName.length <= 120 && PHONE_RE.test(workPhoneE164)
  if (!valid) { res.status(400).json({ error: 'invalid_body' }); return }

  const service = serverClient(admin.url, requireEnv('SUPABASE_SERVICE_ROLE_KEY'))
  const { data, error } = await service.auth.admin.inviteUserByEmail(email.toLowerCase(), {
    data: { full_name: fullName, work_phone_e164: workPhoneE164 },
  })
  if (error || !data.user) {
    console.error('invite-employee failed', error)
    // Raw provider messages are not shown to the client; only the one actionable case is surfaced.
    const alreadyRegistered = error?.status === 422 || /already.*registered|already been registered/i.test(error?.message ?? '')
    res.status(alreadyRegistered ? 409 : 400).json({ error: alreadyRegistered ? 'email_already_registered' : 'invite_failed' })
    return
  }
  res.status(201).json({ id: data.user.id })
}
