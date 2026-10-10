/* eslint-disable react-refresh/only-export-components */
import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { normalizePhone } from '../lib/phone'
import { fromRow } from '../lib/api/shared'
import { AppError, errorFromBody, type AppErrorCode } from '../lib/appError'
import { isSupabaseConfigured, requireSupabase, supabase } from '../lib/supabase'
import type { EmployeeProfile } from './types'

interface AuthContextValue {
  loading: boolean
  configured: boolean
  session?: Session
  profile?: EmployeeProfile
  /** Administrators sign in with email and password; the endpoint refuses every non-admin profile. */
  loginAdmin(email: string, password: string): Promise<void>
  /** Sales staff sign in with their phone number alone (no password). */
  loginWithPhone(phone: string): Promise<void>
  logout(): Promise<void>
  refreshProfile(): Promise<void>
  updateProfile(input: {
    fullName: string
    email: string
    workPhone: string
  }): Promise<{ emailChangeRequested: boolean }>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function isE2EAuthBypass(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_E2E_AUTH_BYPASS === '1'
}

function e2eProfile(): EmployeeProfile | undefined {
  if (!isE2EAuthBypass()) return undefined
  return {
    id: '00000000-0000-4000-8000-000000000001',
    full_name: 'E2E Sales',
    email: 'e2e@example.test',
    role: 'SALES',
    status: 'active',
    requested_phone_e164: '+905551112233',
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  }
}

/** Calls one of our phone sign-in endpoints and installs the session tokens it returns. */
async function exchangeForSession(
  path: string,
  body: Record<string, unknown>,
  fallbackCode: AppErrorCode,
  fallbackError: string,
): Promise<Session | null> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string
    refresh_token?: string
    error?: string
    code?: string
  }
  if (!response.ok || !payload.access_token || !payload.refresh_token)
    throw errorFromBody(payload, fallbackCode, fallbackError)
  const { data, error } = await requireSupabase().auth.setSession({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
  })
  if (error) throw error
  return data.session
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const bypass = e2eProfile()
  const [session, setSession] = useState<Session>()
  const [profile, setProfile] = useState<EmployeeProfile | undefined>(bypass)
  const [loading, setLoading] = useState(!bypass && isSupabaseConfigured)

  const loadProfile = async (nextSession: Session | null) => {
    setSession(nextSession ?? undefined)
    if (!nextSession) {
      setProfile(undefined)
      setLoading(false)
      return
    }
    const { data, error } = await requireSupabase().from('profiles').select('*').eq('id', nextSession.user.id).single()
    if (error) throw error
    setProfile(fromRow<EmployeeProfile>(data))
    setLoading(false)
  }

  useEffect(() => {
    if (bypass || !supabase) {
      setLoading(false)
      return
    }
    void supabase.auth
      .getSession()
      .then(({ data }) => loadProfile(data.session))
      .catch(() => setLoading(false))
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      void loadProfile(next).catch(() => setLoading(false))
    })
    return () => data.subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      configured: Boolean(bypass) || isSupabaseConfigured,
      session,
      profile,
      async loginAdmin(rawEmail, password) {
        const email = rawEmail.trim().toLowerCase()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          throw new AppError('invalid_email', 'Enter a valid email address.')
        await loadProfile(
          await exchangeForSession(
            '/api/auth/admin-login',
            { email, password },
            'invalid_credentials',
            'Invalid email or password.',
          ),
        )
      },
      async loginWithPhone(rawPhone) {
        const phone = normalizePhone(rawPhone)
        if (!phone)
          throw new AppError('invalid_phone', 'Enter an international phone number, for example +905551112233.')
        await loadProfile(
          await exchangeForSession(
            '/api/auth/employee-login',
            { phone },
            'sign_in_failed',
            'Sign-in failed. Please try again.',
          ),
        )
      },
      async logout() {
        if (bypass) return
        await requireSupabase().auth.signOut()
        setProfile(undefined)
      },
      async refreshProfile() {
        if (bypass) return
        await loadProfile(session ?? null)
      },
      async updateProfile({ fullName, email, workPhone }) {
        if (!profile) throw new AppError('session_expired', 'Not authenticated')
        const trimmedName = fullName.trim()
        if (trimmedName.length < 2) throw new AppError('name_required', 'Enter your full name.')
        const normalizedEmail = email.trim().toLowerCase()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
          throw new AppError('invalid_email', 'Enter a valid email address.')
        const phone = normalizePhone(workPhone)
        if (!phone) throw new AppError('invalid_phone', 'Enter an international phone number in E.164 format.')
        const emailChanged = normalizedEmail !== profile.email.toLowerCase()
        if (emailChanged) {
          const { error: emailError } = await requireSupabase().auth.updateUser({ email: normalizedEmail })
          if (emailError) throw emailError
        }
        const { error } = await requireSupabase()
          .from('profiles')
          .update({ full_name: trimmedName, requested_phone_e164: phone })
          .eq('id', profile.id)
        if (error) throw error
        await loadProfile(session ?? null)
        return { emailChangeRequested: emailChanged }
      },
    }),
    [bypass, loading, profile, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
