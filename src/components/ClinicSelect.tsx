import { FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { clinicRegistry } from '../clinics/registry'
import { clinicIds, type ClinicId } from '../clinics/types'

export function ClinicSelect({ onSelect }: { onSelect: (clinicId: ClinicId) => void }) {
  const { t } = useTranslation()
  return <div className="grid min-h-screen place-items-center bg-parchment p-6 text-ink">
    <div className="w-full max-w-2xl">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-3 grid size-12 place-items-center rounded-full border border-gold/70 text-gold"><FileText size={22} /></span>
        <h1 className="text-2xl font-bold tracking-tight">{t('clinicSelect.title')}</h1>
        <p className="mt-1 text-sm text-stone-600">{t('clinicSelect.subtitle')}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {clinicIds.map((clinicId) => {
          const clinic = clinicRegistry[clinicId]
          return <button
            key={clinicId}
            type="button"
            onClick={() => onSelect(clinicId)}
            className="rounded-xl border border-stone-300 bg-white p-6 text-start shadow-sm transition hover:-translate-y-0.5 hover:border-gold hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <h2 className="text-lg font-bold">{clinic.displayName}</h2>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-stone-500">{t('clinicSelect.selectClinic')}</p>
          </button>
        })}
      </div>
    </div>
  </div>
}
