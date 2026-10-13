import {
  bodyObject,
  requirePost,
  serverClient,
  supabaseEnv,
  type ServerlessRequest,
  type ServerlessResponse,
} from '../_lib/http.js'
import { pickEmployeeProfile, type LoginCandidate } from '../../src/lib/employeeLogin.js'
import { normalizePhone } from '../../src/lib/phone.js'
import { fromRow } from '../../src/lib/rows.js'

const NOT_FOUND = 'No active employee account uses this phone number.'

// Phone-only sign-in for sales staff, by product decision: whoever has the number can open that
// employee's reports. Admin accounts are excluded (see pickEmployeeProfile) and keep password login.
export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (!requirePost(req, res)) return
  const body = bodyObject(req)
  const phone = typeof body.phone === 'string' ? normalizePhone(body.phone) : undefined
  if (!phone) {
    res
      .status(400)
      .json({ error: 'Enter an international phone number, for example +905551112233.', code: 'invalid_phone' })
    return
  }

  const env = supabaseEnv()
  if (!env) {
    res.status(500).json({ error: 'auth_not_configured' })
    return
  }

  try {
    const service = serverClient(env.url, env.serviceKey)
    const { data: profiles, error: lookupError } = await service
      .from('profiles')
      .select('id,email,role,status,created_at')
      .eq('requested_phone_e164', phone)
    if (lookupError) throw lookupError

    // An employee may own extra sign-in numbers (profile_login_phones); they open the same account.
    const { data: extra, error: extraError } = await service
      .from('profile_login_phones')
      .select('profile_id,admin_login')
      .eq('phone_e164', phone)
    if (extraError) throw extraError
    const extraIds = extra.map((row) => row.profile_id).filter((id) => !profiles.some((p) => p.id === id))
    if (extraIds.length > 0) {
      const { data: viaExtra, error: viaError } = await service
        .from('profiles')
        .select('id,email,role,status,created_at')
        .in('id', extraIds)
      if (viaError) throw viaError
      profiles.push(...viaExtra)
    }

    // An admin is reachable by phone only when that exact number was explicitly enabled for admin sign-in
    // (profile_login_phones.admin_login, service-role written); every other admin stays password-only.
    const adminLoginIds = new Set(extra.filter((row) => row.admin_login).map((row) => row.profile_id))
    const enabledAdmin = profiles.find((p) => adminLoginIds.has(p.id) && p.role === 'ADMIN' && p.status === 'active')

    const candidates = profiles.map(fromRow<LoginCandidate>)
    // Candidates share one phone (name-typo duplicates), so this is a handful of cheap head-counts; run them together.
    const countResults = await Promise.all(
      candidates.map(async (profile) => {
        const { count, error } = await service
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .eq('created_by_employee_id', profile.id)
        if (error) throw error
        return [profile.id, count ?? 0] as const
      }),
    )
    const counts = new Map<string, number>(countResults)
    const profile = enabledAdmin ? fromRow<LoginCandidate>(enabledAdmin) : pickEmployeeProfile(candidates, counts)
    if (!profile) {
      res.status(401).json({ error: NOT_FOUND, code: 'employee_not_found' })
      return
    }

    // generateLink only mints a one-time token (no email is sent); exchanging it yields a normal session.
    const { data: link, error: linkError } = await service.auth.admin.generateLink({
      type: 'magiclink',
      email: profile.email,
    })
    if (linkError || !link.properties?.hashed_token) throw linkError ?? new Error('Could not create sign-in token.')
    const auth = serverClient(env.url, env.anonKey)
    const { data, error } = await auth.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
    if (error || !data.session) throw error ?? new Error('Could not create session.')

    res.status(200).json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token })
  } catch (error) {
    console.error('employee-login failed', error)
    res.status(500).json({ error: 'Sign-in failed. Please try again.', code: 'sign_in_failed' })
  }
}
