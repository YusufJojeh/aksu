import { FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { clinicRegistry } from '../clinics/registry'
import { clinicIds, type ClinicId } from '../clinics/types'

export function ClinicSelect({ onSelect }: { onSelect: (clinicId: ClinicId) => void }) {
  const { t } = useTranslation()
  return (
    <div className="grid flex-1 place-items-center bg-parchment p-6 text-ink">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-3 grid size-12 place-items-center rounded-full border border-gold/70 text-gold">
            <FileText size={22} />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">{t('clinicSelect.title')}</h1>
          <p className="mt-1 text-sm text-stone-600">{t('clinicSelect.subtitle')}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {clinicIds.map((clinicId) => {
            const clinic = clinicRegistry[clinicId]
            return (
              <button
                key={clinicId}
                type="button"
                onClick={() => onSelect(clinicId)}
                className="rounded-xl border border-stone-300 bg-white p-6 text-start shadow-sm transition-[transform,border-color,box-shadow] duration-200 ease-out-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:border-gold [@media(hover:hover)]:hover:shadow-md motion-reduce:[@media(hover:hover)]:hover:translate-y-0"
              >
                <h2 className="text-lg font-bold">{clinic.displayName}</h2>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  {t('clinicSelect.selectClinic')}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
