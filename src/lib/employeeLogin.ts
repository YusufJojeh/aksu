export interface LoginCandidate {
  id: string
  email: string
  role: 'ADMIN' | 'TEAM_LEAD' | 'SALES'
  status: 'pending' | 'active' | 'suspended' | 'former'
  created_at: string
}

/**
 * Phone-only sign-in is for sales staff only: an admin or team-lead account must never be reachable by
 * knowing a phone number (unless that exact number was enabled), so any manager on that phone blocks the login.
 * Among active sales profiles sharing the phone (name-typo duplicates), the one holding the most
 * reports is the person's real identity, then the oldest — the same rule the admin dashboard uses.
 */
export function pickEmployeeProfile(
  candidates: LoginCandidate[],
  reportCounts: Map<string, number>,
): LoginCandidate | undefined {
  if (candidates.some((profile) => profile.role !== 'SALES')) return undefined
  const count = (profile: LoginCandidate) => reportCounts.get(profile.id) ?? 0
  return candidates
    .filter((profile) => profile.role === 'SALES' && profile.status === 'active')
    .sort((a, b) => count(b) - count(a) || new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]
}
