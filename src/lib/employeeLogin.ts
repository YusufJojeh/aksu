export interface LoginCandidate {
  id: string
  email: string
  role: 'ADMIN' | 'SALES'
  status: 'pending' | 'active' | 'suspended' | 'former'
  created_at: string
}

/**
 * Phone-only sign-in is for sales staff only: an admin account must never be reachable by
 * knowing a phone number, so any admin on that phone blocks the login instead of being skipped.
 * Among active sales profiles sharing the phone (name-typo duplicates), the one holding the most
 * reports is the person's real identity, then the oldest — the same rule the admin dashboard uses.
 */
export function pickEmployeeProfile(
  candidates: LoginCandidate[],
  reportCounts: Map<string, number>,
): LoginCandidate | undefined {
  if (candidates.some((profile) => profile.role === 'ADMIN')) return undefined
  const count = (profile: LoginCandidate) => reportCounts.get(profile.id) ?? 0
  return candidates
    .filter((profile) => profile.role === 'SALES' && profile.status === 'active')
    .sort((a, b) => count(b) - count(a) || new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]
}
