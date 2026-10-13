// Imports sales employees from a JSON list (default scripts/mb-employees.json, the MB Dental team) and locks every
// one of them to a clinic, so on sign-in they open that clinic and nothing else. An entry may carry extraPhones:
// more numbers that also sign in to the same account.
// Idempotent: a phone already in use is locked, never duplicated, and a possible duplicate by name is only reported.
//
//   node --env-file=.env.local scripts/import-mb-employees.ts           # dry run (default), writes nothing
//   node --env-file=.env.local scripts/import-mb-employees.ts --apply   # performs the changes
//   ... --clinic aksu --file aksu-employees.json                        # Dr. Aksu team instead of MB Dental
//
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, and the 202610130001 migration applied.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { planMbImport, type ExistingProfile, type MbEmployeeEntry } from '../src/lib/mbImport.ts'

const apply = process.argv.includes('--apply')
const flag = (name: string, fallback: string) => {
  const at = process.argv.indexOf(name)
  return at >= 0 && process.argv[at + 1] ? process.argv[at + 1] : fallback
}
const clinicId = flag('--clinic', 'mb-dental')
if (!['aksu', 'mb-dental'].includes(clinicId)) throw new Error(`Unknown clinic "${clinicId}".`)
const clinicLabel = clinicId === 'aksu' ? 'Dr. Aksu' : 'MB Dental'
const emailPrefix = clinicId === 'aksu' ? 'aksu' : 'mb'
const listFile = flag('--file', 'mb-employees.json')
const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (node --env-file=.env.local ...).')
  process.exit(1)
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const entries = (JSON.parse(readFileSync(new URL(`./${listFile}`, import.meta.url), 'utf8')) as MbEmployeeEntry[]).map(
  ({ name, phone, extraPhones }) => ({ name, phone, extraPhones }),
)

let { data: profiles, error } = await db
  .from('profiles')
  .select('id,full_name,requested_phone_e164,role,status,clinic_id')
if (error && !apply) {
  // Dry run before the migration is applied: profiles.clinic_id does not exist yet, so nobody is locked.
  console.log(
    '(profiles.clinic_id not found - has the 202610130001 migration been applied? Dry run continues without it.)',
  )
  const retry = await db.from('profiles').select('id,full_name,requested_phone_e164,role,status')
  profiles = retry.data?.map((row) => ({ ...row, clinic_id: null })) ?? null
  error = retry.error
}
if (error || !profiles) throw error ?? new Error('Could not read profiles.')
const plan = planMbImport(entries, profiles as ExistingProfile[], clinicId)

const { data: adminRow } = await db.from('profiles').select('id').eq('role', 'ADMIN').eq('status', 'active').limit(1)
const adminId = adminRow?.[0]?.id as string | undefined

/** Gives the employee their own WhatsApp number as the report channel, unless either side is already taken. */
async function assignChannel(employeeId: string, entry: MbEmployeeEntry): Promise<string> {
  if (!adminId) return 'channel skipped (no active admin to record the assignment)'
  const { data: found } = await db.from('communication_channels').select('id,status').eq('phone_e164', entry.phone)
  let channelId = found?.[0]?.id as string | undefined
  if (!channelId) {
    const { data: created, error: createError } = await db
      .from('communication_channels')
      .insert({ phone_e164: entry.phone, type: 'whatsapp', label: `${clinicLabel} - ${entry.name}` })
      .select('id')
      .single()
    if (createError) return `channel failed: ${createError.message}`
    channelId = created.id
  } else if (found?.[0]?.status !== 'active') return 'channel exists but is inactive, left alone'
  const { data: current } = await db
    .from('channel_assignments')
    .select('channel_id,employee_id')
    .is('unassigned_at', null)
    .or(`channel_id.eq.${channelId},employee_id.eq.${employeeId}`)
  if (current?.some((row) => row.channel_id === channelId && row.employee_id === employeeId))
    return 'channel already assigned'
  if (current && current.length > 0) return 'channel or employee already has a different assignment, left alone'
  const { error: assignError } = await db
    .from('channel_assignments')
    .insert({ channel_id: channelId, employee_id: employeeId, assigned_by: adminId })
  return assignError ? `channel assign failed: ${assignError.message}` : 'channel assigned'
}

/** Registers an employee's additional sign-in numbers, never taking a number another account already uses. */
async function registerExtraPhones(employeeId: string, entry: MbEmployeeEntry): Promise<string[]> {
  const notes: string[] = []
  for (const extra of entry.extraPhones ?? []) {
    const { data: owner } = await db.from('profiles').select('id').eq('requested_phone_e164', extra).limit(1)
    if (owner?.length) {
      notes.push(`extra ${extra} is another profile's main number, left alone`)
      continue
    }
    const { data: taken } = await db.from('profile_login_phones').select('profile_id').eq('phone_e164', extra)
    if (taken?.length) {
      notes.push(
        taken[0].profile_id === employeeId
          ? `extra ${extra} already registered`
          : `extra ${extra} belongs to another account, left alone`,
      )
      continue
    }
    const { error: extraError } = await db
      .from('profile_login_phones')
      .insert({ phone_e164: extra, profile_id: employeeId })
    notes.push(extraError ? `extra ${extra} failed: ${extraError.message}` : `extra ${extra} registered`)
  }
  return notes
}

for (const action of plan) {
  const { entry } = action
  const label = `${entry.name} ${entry.phone}`
  if (action.kind === 'review') {
    console.log(
      `REVIEW  ${label} -> same person as "${action.profile.full_name}" (${action.profile.requested_phone_e164}, ${action.profile.role})? skipped`,
    )
    continue
  }
  if (action.kind === 'lock-existing') {
    const { profile } = action
    const already = profile.clinic_id === clinicId
    const otherClinic = profile.clinic_id && profile.clinic_id !== clinicId
    console.log(
      `LOCK    ${label} -> existing "${profile.full_name}" (${profile.status})${already ? ' (already locked)' : ''}${entry.extraPhones?.length ? ` + ${entry.extraPhones.join(', ')}` : ''}`,
    )
    if (otherClinic) {
      console.log(`        locked to "${profile.clinic_id}" already, left alone`)
      continue
    }
    if (!apply) continue
    // Every live sales profile on this phone (name-typo duplicates) is locked, so whichever one signs in is covered.
    const { error: lockError } = await db
      .from('profiles')
      .update({ clinic_id: clinicId, status: 'active' })
      .eq('requested_phone_e164', entry.phone)
      .eq('role', 'SALES')
      .in('status', ['pending', 'active'])
      .is('clinic_id', null)
    if (lockError) throw lockError
    console.log(`        ${await assignChannel(profile.id, entry)}`)
    for (const note of await registerExtraPhones(profile.id, entry)) console.log(`        ${note}`)
    continue
  }
  console.log(`CREATE  ${label}`)
  if (!apply) continue
  const email = `${emailPrefix}-${entry.phone.slice(1)}@pdfbuilder.local`
  const { data: user, error: createError } = await db.auth.admin.createUser({
    email,
    password: `${crypto.randomUUID()}${crypto.randomUUID()}`,
    email_confirm: true,
    user_metadata: { full_name: entry.name, work_phone_e164: entry.phone },
  })
  if (createError || !user.user) {
    console.log(`        FAILED: ${createError?.message ?? 'no user returned'}`)
    continue
  }
  const { error: activateError } = await db
    .from('profiles')
    .update({ status: 'active', clinic_id: clinicId })
    .eq('id', user.user.id)
  if (activateError) {
    await db.auth.admin.deleteUser(user.user.id)
    console.log(`        FAILED to activate, rolled back: ${activateError.message}`)
    continue
  }
  console.log(`        ${await assignChannel(user.user.id, entry)}`)
  for (const note of await registerExtraPhones(user.user.id, entry)) console.log(`        ${note}`)
}
const count = (kind: string) => plan.filter((action) => action.kind === kind).length
console.log(
  `\n${apply ? 'Applied' : 'Dry run (nothing written)'}: ${count('create')} to create, ${count('lock-existing')} existing to lock, ${count('review')} to review.`,
)
