import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/AuthProvider'
import { AuthScreen } from '../../auth/AuthScreen'
import { isManagerRole } from '../../auth/types'
import { Button } from '../ui'
import { AdminDashboard } from './AdminDashboard'
import { useAdminLocale } from './useAdminLocale'

// Everything under /admin: sign-in, account-state gates and the dashboard share one persisted UI language.
export function AdminGate() {
  const auth = useAuth()
  const { t } = useTranslation()
  const [locale, setLocale] = useAdminLocale()

  if (auth.loading)
    return (
      <div className="grid min-h-screen place-items-center bg-parchment text-sm text-stone-600">
        {t('adminAuth.loading')}
      </div>
    )
  if (!auth.profile) return <AuthScreen locale={locale} onLocaleChange={setLocale} />
  if (auth.profile.status !== 'active')
    return (
      <main className="grid min-h-screen place-items-center bg-parchment p-6">
        <div className="max-w-md rounded-xl border border-stone-200 bg-white p-6 text-center">
          <h1 className="text-xl font-bold">
            {t('adminAuth.accountStatus', { status: t(`admin.status.${auth.profile.status}`) })}
          </h1>
          <p className="mt-2 text-sm text-stone-600">{t('adminAuth.inactiveBody')}</p>
          <Button className="mt-5" onClick={() => void auth.logout()}>
            {t('adminAuth.signOut')}
          </Button>
        </div>
      </main>
    )
  return isManagerRole(auth.profile.role) ? (
    <AdminDashboard onLogout={() => void auth.logout()} locale={locale} onLocaleChange={setLocale} />
  ) : (
    <main className="grid min-h-screen place-items-center bg-parchment p-6">
      <div className="text-center">
        <h1 className="text-xl font-bold">{t('adminAuth.accessDenied')}</h1>
        <Button
          className="mt-4"
          onClick={() => {
            window.location.href = '/'
          }}
        >
          {t('adminAuth.returnToWorkspace')}
        </Button>
      </div>
    </main>
  )
}
