import { createClient } from '@supabase/supabase-js'
import { pickEmployeeProfile, type LoginCandidate } from '../../src/lib/employeeLogin.js'
import { normalizePhone } from '../../src/lib/phone.js'

interface ServerlessRequest {
  method?: string
  body?: unknown
}

interface ServerlessResponse {
  status(code: number): ServerlessResponse
  json(payload: unknown): void
}

const NOT_FOUND = 'No active employee account uses this phone number.'

// Phone-only sign-in for sales staff, by product decision: whoever has the number can open that
// employee's reports. Admin accounts are excluded (see pickEmployeeProfile) and keep password login.
export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return }
  const body = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as { phone?: unknown }
  const phone = typeof body.phone === 'string' ? normalizePhone(body.phone) : undefined
  if (!phone) { res.status(400).json({ error: 'Enter an international phone number, for example +905551112233.' }); return }

  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceKey) { res.status(500).json({ error: 'auth_not_configured' }); return }

  try {
    const options = { auth: { persistSession: false, autoRefreshToken: false } }
    const service = createClient(url, serviceKey, options)
    const { data: profiles, error: lookupError } = await service
      .from('profiles')
      .select('id,email,role,status,created_at')
      .eq('requested_phone_e164', phone)
    if (lookupError) throw lookupError

    const candidates = (profiles ?? []) as LoginCandidate[]
    // Candidates share one phone (name-typo duplicates), so this is a handful of cheap head-counts; run them together.
    const countResults = await Promise.all(candidates.map(async (profile) => {
      const { count, error } = await service.from('reports').select('id', { count: 'exact', head: true }).eq('created_by_employee_id', profile.id)
      if (error) throw error
      return [profile.id, count ?? 0] as const
    }))
    const counts = new Map<string, number>(countResults)
    const profile = pickEmployeeProfile(candidates, counts)
    if (!profile) { res.status(401).json({ error: NOT_FOUND }); return }

    // generateLink only mints a one-time token (no email is sent); exchanging it yields a normal session.
    const { data: link, error: linkError } = await service.auth.admin.generateLink({ type: 'magiclink', email: profile.email })
    if (linkError || !link.properties?.hashed_token) throw linkError ?? new Error('Could not create sign-in token.')
    const auth = createClient(url, anonKey, options)
    const { data, error } = await auth.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
    if (error || !data.session) throw error ?? new Error('Could not create session.')

    res.status(200).json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token })
  } catch (error) {
    console.error('employee-login failed', error)
    res.status(500).json({ error: 'Sign-in failed. Please try again.' })
  }
}
