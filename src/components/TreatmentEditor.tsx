import { Controller, useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { ReportData } from '../domain/report'
import { rowTotalMinor, visitTotalMinor } from '../domain/calculations'
import { formatMoneyMinor } from '../lib/locale'
import { Checkbox, Input } from './ui'

export function TreatmentEditor({ visit }: { visit: 'firstVisit' | 'secondVisit' }) {
  const { t } = useTranslation()
  const { register, control, watch } = useFormContext<ReportData>()
  const report = watch()
  const rows = report[visit].treatmentRows
  return <div className="space-y-2">
    <div className="hidden grid-cols-[32px_1.5fr_1fr_72px_96px_72px] gap-2 px-2 text-[11px] font-bold uppercase tracking-wide text-stone-500 lg:grid">
      <span /><span>{t('fields.treatment')}</span><span>{t('fields.quality')}</span><span>{t('fields.quantity')}</span><span>{t('fields.unitPrice')}</span><span>{t('fields.total')}</span>
    </div>
    {rows.map((row, index) => <div key={row.id} className="grid gap-2 rounded-lg border border-stone-200 bg-white p-3 lg:grid-cols-[32px_1.5fr_1fr_72px_96px_72px] lg:items-center lg:border-0 lg:border-b lg:bg-transparent lg:p-2">
      <Controller control={control} name={`${visit}.treatmentRows.${index}.enabled`} render={({ field }) => <Checkbox aria-label={t('fields.enabled')} checked={field.value} onChange={field.onChange} />} />
      <label className="grid gap-1 text-xs font-semibold text-stone-500 lg:block"><span className="lg:hidden">{t('fields.treatment')}</span><Input aria-label={t('fields.treatment')} className="h-9" placeholder={row.treatmentKey ? t(`treatments.${row.treatmentKey}`) : t('fields.customTreatment')} {...register(`${visit}.treatmentRows.${index}.customTreatment`)} /></label>
      <label className="grid gap-1 text-xs font-semibold text-stone-500 lg:block"><span className="lg:hidden">{t('fields.quality')}</span><Input aria-label={t('fields.quality')} className="h-9" {...register(`${visit}.treatmentRows.${index}.quality`)} /></label>
      <label className="grid gap-1 text-xs font-semibold text-stone-500 lg:block"><span className="lg:hidden">{t('fields.quantity')}</span><Input aria-label={t('fields.quantity')} className="h-9" type="number" min="0" step="1" {...register(`${visit}.treatmentRows.${index}.quantity`, { valueAsNumber: true })} /></label>
      <div className="grid gap-2">
        <label className="grid gap-1 text-xs font-semibold text-stone-500 lg:block"><span className="lg:hidden">{t('fields.unitPrice')}</span><Input aria-label={t('fields.unitPrice')} className="h-9" type="number" min="0" step="0.01" disabled={row.included} {...register(`${visit}.treatmentRows.${index}.unitPrice`, { valueAsNumber: true })} /></label>
        <Controller control={control} name={`${visit}.treatmentRows.${index}.included`} render={({ field }) => <Checkbox className="text-xs text-stone-600" checked={field.value} onChange={field.onChange} label={t('fields.included')} />} />
        {(row.included || report.clinicId === 'mb-dental') && <Input aria-label={t('fields.duration')} className="h-8" placeholder={t('fields.duration')} {...register(`${visit}.treatmentRows.${index}.duration`)} />}
      </div>
      <output className="text-end text-sm font-bold text-ink">{row.included ? t('document.included') : formatMoneyMinor(rowTotalMinor(row), report.document.currency, report.document.locale)}</output>
    </div>)}
    <div className="flex items-center justify-between border-t-2 border-ink pt-3 text-sm font-bold"><span>{t('fields.total')}</span><output data-testid={`${visit}-total`} className="text-lg">{formatMoneyMinor(visitTotalMinor(rows), report.document.currency, report.document.locale)}</output></div>
  </div>
}
