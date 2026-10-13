/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_E2E_AUTH_BYPASS?: string
  /** 'true' hides the clinic picker until the employee has signed in (production). */
  readonly VITE_REQUIRE_SIGN_IN?: string
}
