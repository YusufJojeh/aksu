/* eslint-disable react-refresh/only-export-components */
import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { normalizePhone } from '../lib/phone'
import { isSupabaseConfigured, requireSupabase, supabase } from '../lib/supabase'
import type { EmployeeProfile } from './types'

interface AuthContextValue {
  loading: boolean
  configured: boolean
  session?: Session
  profile?: EmployeeProfile
  login(email: string, password: string): Promise<void>
  register(input: { fullName: string; email: string; password: string; workPhone: string }): Promise<void>
  logout(): Promise<void>
  refreshProfile(): Promise<void>
  updateProfile(input: { fullName: string; workPhone: string }): Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function isE2EAuthBypass(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_E2E_AUTH_BYPASS === '1'
}

function e2eProfile(): EmployeeProfile | undefined {
  if (!isE2EAuthBypass()) return undefined
  return {
    id: '00000000-0000-4000-8000-000000000001', full_name: 'E2E Sales', email: 'e2e@example.test',
    role: 'SALES', status: 'active', requested_phone_e164: '+905551112233',
    created_at: new Date(0).toISOString(), updated_at: new Date(0).toISOString(),
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const bypass = e2eProfile()
  const [session, setSession] = useState<Session>()
  const [profile, setProfile] = useState<EmployeeProfile | undefined>(bypass)
  const [loading, setLoading] = useState(!bypass && isSupabaseConfigured)

  const loadProfile = async (nextSession: Session | null) => {
    setSession(nextSession ?? undefined)
    if (!nextSession) { setProfile(undefined); setLoading(false); return }
    const { data, error } = await requireSupabase().from('profiles').select('*').eq('id', nextSession.user.id).single()
    if (error) throw error
    setProfile(data as EmployeeProfile)
    setLoading(false)
  }

  useEffect(() => {
    if (bypass || !supabase) { setLoading(false); return }
    void supabase.auth.getSession().then(({ data }) => loadProfile(data.session)).catch(() => setLoading(false))
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { void loadProfile(next).catch(() => setLoading(false)) })
    return () => data.subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    configured: Boolean(bypass) || isSupabaseConfigured,
    session,
    profile,
    async login(email, password) {
      const { data, error } = await requireSupabase().auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
      if (error) throw error
      await loadProfile(data.session)
    },
    async register({ fullName, email, password, workPhone }) {
      const phone = normalizePhone(workPhone)
      if (!phone) throw new Error('Enter an international phone number in E.164 format, for example +905551112233.')
      const { error } = await requireSupabase().auth.signUp({
        email: email.trim().toLowerCase(), password,
        options: { data: { full_name: fullName.trim(), work_phone_e164: phone } },
      })
      if (error) throw error
    },
    async logout() { if (bypass) return; await requireSupabase().auth.signOut(); setProfile(undefined) },
    async refreshProfile() { if (bypass) return; await loadProfile(session ?? null) },
    async updateProfile({ fullName, workPhone }) {
      if (!profile) throw new Error('Not authenticated')
      const phone = normalizePhone(workPhone)
      if (!phone) throw new Error('Enter an international phone number in E.164 format.')
      const { error } = await requireSupabase().from('profiles').update({ full_name: fullName.trim(), requested_phone_e164: phone }).eq('id', profile.id)
      if (error) throw error
      await loadProfile(session ?? null)
    },
  }), [bypass, loading, profile, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
