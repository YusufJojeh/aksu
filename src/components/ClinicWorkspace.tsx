import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeftRight, Download, FileText, Languages, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { FormProvider, useForm, useWatch, type Resolver } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { isE2EAuthBypass } from '../auth/AuthProvider'
import type { EmployeeProfile } from '../auth/types'
import { clinicRegistry } from '../clinics/registry'
import type { ClinicId } from '../clinics/types'
import { createDefaultReport, locales, reportSchema, type Locale, type ReportData } from '../domain/report'
import { isRtl } from '../lib/locale'
import { reportFilename } from '../lib/filename'
import { downloadArchivedReport, finalizeReport, type ArchivedReport } from '../lib/operations'
import { usePdfPreview } from '../hooks/usePdfPreview'
import { generateReport } from '../pdf/generateReport'
import { AksuReportForm } from './AksuReportForm'
import { MbReportForm } from './MbReportForm'
import { PdfPreview } from './PdfPreview'
import { Button, ConfirmDialog, Select, Tabs, TabsList, TabsTrigger } from './ui'

export function ClinicWorkspace({ clinicId, profile, initialReport, parentReportId, interfaceLocale, onInterfaceLocaleChange, onSwitchClinic }: {
  clinicId: ClinicId
  profile: EmployeeProfile
  initialReport?: ReportData
  parentReportId?: string
  interfaceLocale: Locale
  onInterfaceLocaleChange: (locale: Locale) => void
  onSwitchClinic: () => void
}) {
  const { t } = useTranslation()
  const [mobilePanel, setMobilePanel] = useState('edit')
  const [dialog, setDialog] = useState<'reset' | 'clear' | 'switchClinic'>()
  const [finalized, setFinalized] = useState<{ report: ArchivedReport; snapshot: string }>()
  const [finalizeError, setFinalizeError] = useState<string>()
  const [isDownloading, setIsDownloading] = useState(false)
  const defaults = useMemo(() => initialReport?.clinicId === clinicId ? initialReport : createDefaultReport(clinicId), [clinicId, initialReport])
  const form = useForm<ReportData>({ defaultValues: defaults, resolver: zodResolver(reportSchema) as Resolver<ReportData>, mode: 'onBlur' })
  const { isDirty } = form.formState
  const report = useWatch({ control: form.control }) as ReportData
  const preview = usePdfPreview(report)
  const clinic = clinicRegistry[clinicId]

  const download = async () => {
    if (!await form.trigger()) return
    setFinalizeError(undefined)
    const validated = reportSchema.parse(form.getValues())
    const snapshot = JSON.stringify(validated)
    let blob: Blob
    if (isE2EAuthBypass()) {
      const generated = await generateReport(validated)
      blob = new Blob([Uint8Array.from(generated.bytes)], { type: 'application/pdf' })
    } else if (finalized?.snapshot === snapshot) {
      blob = await downloadArchivedReport(finalized.report)
    } else {
      const generated = await generateReport(validated)
      const archived = await finalizeReport(validated, generated.bytes, profile, parentReportId)
      setFinalized({ report: archived, snapshot })
      blob = await downloadArchivedReport(archived)
    }
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = reportFilename(clinicId, report.patient.name, report.patient.reportDate, report.document.locale)
    document.body.appendChild(anchor); anchor.click(); anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  const handleDownload = async () => {
    if (isDownloading) return
    setIsDownloading(true); setFinalizeError(undefined)
    try { await download() }
    catch (caught) { setFinalizeError(caught instanceof Error ? caught.message : 'Finalization failed.') }
    finally { setIsDownloading(false) }
  }

  const reset = () => form.reset(createDefaultReport(clinicId))
  const clearPatient = () => {
    const blankPatient = clinicId === 'aksu'
      ? { reportDate: '', name: '', age: 0, phone: '' }
      : { reportDate: '', name: '', age: 0, phone: '', patientId: '' }
    form.setValue('patient', blankPatient as ReportData['patient'], { shouldDirty: true })
  }

  const requestSwitchClinic = () => {
    if (isDirty) setDialog('switchClinic')
    else onSwitchClinic()
  }

  return <div className="min-h-screen bg-parchment text-ink" dir={isRtl(interfaceLocale) ? 'rtl' : 'ltr'}>
    <header className="border-b border-stone-300 bg-ink text-white">
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-7">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full border border-gold/70 text-gold"><FileText size={20} /></span><div><h1 className="text-lg font-bold tracking-tight">{t('app.title')}</h1><p className="text-xs text-stone-300">{clinic.displayName}</p></div></div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="!border-stone-600 !bg-stone-800 !text-white hover:!bg-stone-700" onClick={requestSwitchClinic}><ArrowLeftRight size={16} />{t('actions.switchClinic')}</Button>
          <label className="flex items-center gap-2 text-xs font-semibold text-stone-200"><Languages size={16} /><span className="sr-only sm:not-sr-only">{t('fields.interfaceLanguage')}</span><Select className="interface-language-select h-9 !w-36 border-stone-600 !bg-stone-800 !text-white" value={interfaceLocale} onChange={(event) => onInterfaceLocaleChange(event.target.value as Locale)}>{locales.map((locale) => <option key={locale} value={locale}>{t(`languages.${locale}`)}</option>)}</Select></label>
        </div>
      </div>
    </header>
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-950"><ShieldCheck className="me-2 inline" size={15} />{t('app.privacy')}</div>
    {preview.usedFallback && report.document.locale !== 'en' && <div role="status" className="border-b border-blue-200 bg-blue-50 px-4 py-2 text-center text-xs font-medium text-blue-950">{t('app.templateFallback')}</div>}
    <Tabs value={mobilePanel} onValueChange={setMobilePanel} className="mx-auto max-w-md px-4 pt-4 lg:hidden"><TabsList><TabsTrigger value="edit">{t('actions.showEditor')}</TabsTrigger><TabsTrigger value="preview">{t('actions.showPreview')}</TabsTrigger></TabsList></Tabs>
    <main className="mx-auto grid max-w-[1800px] lg:h-[calc(100vh-137px)] lg:grid-cols-[minmax(520px,45%)_1fr]">
      <FormProvider {...form}>
        <section className={`${mobilePanel === 'preview' ? 'hidden' : 'block'} overflow-y-auto border-e border-stone-300 bg-white lg:block`} aria-label={t('actions.showEditor')}><form onSubmit={(event) => event.preventDefault()}>{clinicId === 'aksu' ? <AksuReportForm /> : <MbReportForm />}</form></section>
        <section className={`${mobilePanel === 'edit' ? 'hidden' : 'block'} paper-texture min-w-0 overflow-y-auto bg-stone-200 lg:block`} aria-label={t('sections.pdfPreview')}><PdfPreview url={preview.url} loading={preview.isGenerating} error={preview.error} /></section>
      </FormProvider>
    </main>
    <footer className="sticky bottom-0 z-30 border-t border-stone-300 bg-white/95 px-4 py-3 shadow-[0_-8px_25px_rgb(0_0_0/8%)] backdrop-blur sm:px-7">
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2"><Button variant="outline" onClick={() => setDialog('reset')}><RotateCcw size={16} />{t('actions.reset')}</Button><Button variant="outline" onClick={() => setDialog('clear')}><Trash2 size={16} /><span className="hidden sm:inline">{t('actions.clear')}</span></Button></div>
        <div className="flex items-center gap-2">{finalizeError && <span role="alert" className="max-w-sm text-xs text-red-700">{finalizeError}</span>}<Button variant="outline" onClick={() => { void preview.regenerate(); setMobilePanel('preview') }}><FileText size={16} />{t('actions.preview')}</Button><Button variant="primary" disabled={isDownloading || preview.isGenerating || !preview.blob} aria-busy={isDownloading} onClick={() => void handleDownload()}><Download size={16} />{finalized?.snapshot === JSON.stringify(report) ? t('actions.download') : `Finalize & ${t('actions.download')}`}</Button></div>
      </div>
    </footer>
    <ConfirmDialog open={dialog === 'reset'} onOpenChange={(open) => !open && setDialog(undefined)} title={t('dialog.resetTitle')} body={t('dialog.resetBody')} confirmLabel={t('actions.confirm')} cancelLabel={t('actions.cancel')} onConfirm={reset} />
    <ConfirmDialog open={dialog === 'clear'} onOpenChange={(open) => !open && setDialog(undefined)} title={t('dialog.clearTitle')} body={t('dialog.clearBody')} confirmLabel={t('actions.confirm')} cancelLabel={t('actions.cancel')} onConfirm={clearPatient} />
    <ConfirmDialog open={dialog === 'switchClinic'} onOpenChange={(open) => !open && setDialog(undefined)} title={t('dialog.switchClinicTitle')} body={t('dialog.switchClinicBody')} confirmLabel={t('actions.confirm')} cancelLabel={t('actions.cancel')} onConfirm={onSwitchClinic} />
  </div>
}
