import { Controller, useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { assessmentKeys, currencies, locales, type ReportData } from '../domain/report'
import { finalTotalMinor } from '../domain/calculations'
import { formatMoneyMinor } from '../lib/locale'
import { Checkbox, Field, Input, Select } from './ui'
import { TreatmentEditor } from './TreatmentEditor'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="border-b border-stone-200 px-5 py-6 sm:px-7"><h2 className="relative mb-5 pb-2 text-base font-bold tracking-tight text-ink after:absolute after:bottom-0 after:start-0 after:h-0.5 after:w-8 after:rounded-full after:bg-gold">{title}</h2>{children}</section>
}

export function ReportForm() {
  const { t } = useTranslation()
  const { register, control, watch, setValue, formState: { errors } } = useFormContext<ReportData>()
  const report = watch()
  const visit = report.firstVisit
  const localeField = register('document.locale')
  return <div>
    <Section title={t('sections.document')}><div className="grid gap-4 sm:grid-cols-2">
      <Field label={t('fields.documentLanguage')}><Select {...localeField} onChange={(event) => { void localeField.onChange(event); if (event.target.value === 'ar') setValue('document.currency', 'EUR', { shouldDirty: true }) }}>{locales.map((locale) => <option key={locale} value={locale}>{t(`languages.${locale}`)}</option>)}</Select></Field>
      <Field label={t('fields.currency')}><Select {...register('document.currency')}>{currencies.map((currency) => <option key={currency}>{currency}</option>)}</Select></Field>
    </div></Section>
    <Section title={t('sections.patient')}><div className="grid gap-4 sm:grid-cols-2">
      <Field label={t('fields.reportDate')} error={errors.patient?.reportDate?.message && t(errors.patient.reportDate.message)}><Input type="date" {...register('patient.reportDate')} /></Field>
      <Field label={t('fields.patientName')} error={errors.patient?.name?.message && t(errors.patient.name.message)}><Input autoComplete="off" {...register('patient.name')} /></Field>
      <Field label={t('fields.age')} error={errors.patient?.age?.message}><Input type="number" min="0" max="120" {...register('patient.age', { valueAsNumber: true })} /></Field>
      <Field label={t('fields.phone')} error={errors.patient?.phone?.message}><Input type="tel" autoComplete="off" {...register('patient.phone')} /></Field>
    </div></Section>
    <Section title={t('sections.assessment')}><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{assessmentKeys.map((key) => <Controller key={key} control={control} name={`assessment.${key}`} render={({ field }) => <Checkbox className="rounded-md px-2 py-1 transition hover:bg-stone-100" checked={field.value} onChange={field.onChange} label={t(`assessment.${key}`)} />} />)}</div></Section>
    <Section title={t('sections.firstVisit')}><TreatmentEditor visit="firstVisit" /></Section>
    <Section title={t('sections.discount')}><div className="space-y-4">
      <Controller control={control} name="firstVisit.discountEnabled" render={({ field }) => <Checkbox className="font-semibold" checked={field.value} onChange={field.onChange} label={t('fields.discountEnabled')} />} />
      {visit.discountEnabled && <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('fields.discountMode')}><Select {...register('firstVisit.discountMode')}><option value="manual_final_price">{t('fields.manualFinalPrice')}</option><option value="percentage">{t('fields.percentage')}</option></Select></Field>
        {report.document.locale !== 'ar' && <Field label={t('fields.discountExpiryDate')} error={errors.firstVisit?.discountExpiryDate?.message && t(errors.firstVisit.discountExpiryDate.message)}><Input type="date" {...register('firstVisit.discountExpiryDate')} /></Field>}
        {visit.discountMode === 'manual_final_price' ? <Field label={t('fields.discountedFinalPrice')}><Input type="number" min="0" step="0.01" {...register('firstVisit.discountedFinalPrice', { valueAsNumber: true })} /></Field> : <Field label={t('fields.discountPercentage')}><Input type="number" min="0" max="100" step="0.01" {...register('firstVisit.discountPercentage', { valueAsNumber: true })} /></Field>}
        <div className="flex items-end justify-between rounded-md bg-amber-50 px-4 py-3 text-sm font-bold text-ink"><span>{t('fields.total')}</span><output>{formatMoneyMinor(finalTotalMinor(report), report.document.currency, report.document.locale)}</output></div>
      </div>}
    </div></Section>
    <Section title={t('sections.secondVisit')}><TreatmentEditor visit="secondVisit" /></Section>
  </div>
}
