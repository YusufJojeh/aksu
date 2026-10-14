// Creates the team-lead accounts (phone-only sign-in, read + review access). Dry run unless --apply.
//   node --env-file=.env.local scripts/create-team-leads.ts [--apply]
import { createClient } from '@supabase/supabase-js'

const apply = process.argv.includes('--apply')
const leads = [
  { name: 'Taghreed', phone: '+96170647811' },
  { name: 'Lilia', phone: '+905013568370' },
  { name: 'Bahaa', phone: '+905527899090' },
  { name: 'Nisreen', phone: '+905446936413' },
  { name: 'Rania', phone: '+905073536840' },
]
const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.')
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

for (const lead of leads) {
  const { data: same } = await db.from('profiles').select('id,full_name,role,status').eq('requested_phone_e164', lead.phone)
  if (same && same.length > 0) {
    console.log(`SKIP    ${lead.name} ${lead.phone}: already used by ${same.map((p) => `${p.full_name} (${p.role}, ${p.status})`).join(', ')}`)
    continue
  }
  console.log(`CREATE  ${lead.name} ${lead.phone} as TEAM_LEAD`)
  if (!apply) continue
  const { data: user, error } = await db.auth.admin.createUser({
    email: `lead-${lead.phone.slice(1)}@pdfbuilder.local`,
    password: `${crypto.randomUUID()}${crypto.randomUUID()}`,
    email_confirm: true,
    user_metadata: { full_name: lead.name, work_phone_e164: lead.phone },
  })
  if (error || !user.user) {
    console.log(`        FAILED: ${error?.message}`)
    continue
  }
  const { error: upError } = await db
    .from('profiles')
    .update({ role: 'TEAM_LEAD', status: 'active', requested_phone_e164: lead.phone })
    .eq('id', user.user.id)
  const { error: phoneError } = await db
    .from('profile_login_phones')
    .insert({ phone_e164: lead.phone, profile_id: user.user.id, admin_login: true })
  if (upError || phoneError) {
    await db.auth.admin.deleteUser(user.user.id)
    console.log(`        FAILED, rolled back: ${upError?.message ?? phoneError?.message}`)
  }
}
console.log(apply ? 'Applied.' : 'Dry run (nothing written).')
