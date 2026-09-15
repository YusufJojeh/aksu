import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { clinicRegistry } from '../clinics/registry'
import { currencies, mbConditionKeys, mbRecommendedTreatmentKeys, type MbReportData } from '../domain/report'
import { coordinatesForMbTemplate, resolveMbTemplate } from '../pdf/profiles/mb'
import { Checkbox, Field, Input, Section, Select } from './ui'
import { TreatmentEditor } from './TreatmentEditor'

export function MbReportForm() {
  const { t } = useTranslation()
  const { register, control, formState: { errors } } = useFormContext<MbReportData>()
  const locale = useWatch({ control, name: 'document.locale' })
  // Offer exactly the rows this locale's artwork actually prints — the PDF profile's measured
  // checkbox squares are the single source of truth, so the form can never offer a treatment
  // that has nowhere to be marked (French prints an extraction row and no fillings row; the
  // other templates print fillings and no extraction row).
  const recommendedBoxes = coordinatesForMbTemplate(resolveMbTemplate(locale).usedTemplate).oralHealth.recommendedTreatments
  const recommendedKeys = mbRecommendedTreatmentKeys.filter((key) => recommendedBoxes[key])
  return <div>
    <Section title={t('sections.document')}><div className="grid gap-4 sm:grid-cols-2">
      <Field label={t('fields.documentLanguage')}><Select {...register('document.locale')}>{clinicRegistry['mb-dental'].supportedDocumentLocales.map((locale) => <option key={locale} value={locale}>{t(`languages.${locale}`)}</option>)}</Select></Field>
      <Field label={t('fields.currency')}><Select {...register('document.currency')}>{currencies.map((currency) => <option key={currency}>{currency}</option>)}</Select></Field>
    </div></Section>
    <Section title={t('sections.patient')}><div className="grid gap-4 sm:grid-cols-2">
      <Field label={t('fields.reportDate')} error={errors.patient?.reportDate?.message && t(errors.patient.reportDate.message)}><Input type="date" {...register('patient.reportDate')} /></Field>
      <Field label={t('fields.patientName')} error={errors.patient?.name?.message && t(errors.patient.name.message)}><Input autoComplete="off" {...register('patient.name')} /></Field>
      <Field label={t('fields.age')} error={errors.patient?.age?.message && t(errors.patient.age.message)}><Input type="number" min="0" max="120" {...register('patient.age', { valueAsNumber: true })} /></Field>
      <Field label={t('fields.patientId')} error={errors.patient?.patientId?.message && t(errors.patient.patientId.message)}><Input autoComplete="off" {...register('patient.patientId')} /></Field>
      <Field label={t('fields.phone')} error={errors.patient?.phone?.message && t(errors.patient.phone.message)}><Input type="tel" autoComplete="off" {...register('patient.phone')} /></Field>
    </div></Section>
    <Section title={t('sections.oralHealthCurrentCondition')}><div className="grid gap-2 sm:grid-cols-2">{mbConditionKeys.map((key) => <Controller key={key} control={control} name={`oralHealth.currentCondition.${key}`} render={({ field }) => <Checkbox className="rounded-md px-2 py-1 transition hover:bg-stone-100" checked={field.value} onChange={field.onChange} label={t(`mbOralHealth.currentCondition.${key}`)} />} />)}</div></Section>
    <Section title={t('sections.oralHealthRecommendedTreatments')}><div className="grid gap-2 sm:grid-cols-2">{recommendedKeys.map((key) => <Controller key={key} control={control} name={`oralHealth.recommendedTreatments.${key}`} render={({ field }) => <Checkbox className="rounded-md px-2 py-1 transition hover:bg-stone-100" checked={field.value} onChange={field.onChange} label={t(`mbOralHealth.recommendedTreatments.${key}`)} />} />)}</div></Section>
    <Section title={t('sections.firstVisit')}><TreatmentEditor visit="firstVisit" /></Section>
    <Section title={t('sections.secondVisit')}><TreatmentEditor visit="secondVisit" /></Section>
  </div>
}
