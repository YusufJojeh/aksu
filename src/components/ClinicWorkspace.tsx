import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeftRight,
  Download,
  FileText,
  Languages,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
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
import { saveBlob } from '../lib/download'
import {
  downloadArchivedReport,
  finalizePublicReport,
  finalizeReport,
  type ArchivedReport,
  type SalesIdentity,
} from '../lib/operations'
import { normalizePhone } from '../lib/phone'
import { usePdfPreview } from '../hooks/usePdfPreview'
import { generateReport } from '../pdf/generateReport'
import { AksuReportForm } from './AksuReportForm'
import { MbDocumentPanel } from './documents/MbDocumentPanel'
import { MbReportForm } from './MbReportForm'
import { PdfPreview } from './PdfPreview'
import { Button, ConfirmDialog, Select, Tabs, TabsList, TabsTrigger } from './ui'
import { errorText } from '../i18n/errorText'

export function ClinicWorkspace({
  clinicId,
  profile,
  salesIdentity,
  initialReport,
  parentReportId,
  interfaceLocale,
  onInterfaceLocaleChange,
  onSwitchClinic,
}: {
  clinicId: ClinicId
  profile?: EmployeeProfile
  salesIdentity?: SalesIdentity
  initialReport?: ReportData
  parentReportId?: string
  interfaceLocale: Locale
  onInterfaceLocaleChange: (locale: Locale) => void
  onSwitchClinic: () => void
}) {
  const { t } = useTranslation()
  const [mobilePanel, setMobilePanel] = useState('edit')
  const [dialog, setDialog] = useState<'reset' | 'clear' | 'switchClinic'>()
  // Keeps the finalized bytes so re-downloading unchanged content never archives a second copy.
  const [finalized, setFinalized] = useState<{
    report: ArchivedReport
    snapshot: string
    bytes: Uint8Array
    signedIn: boolean
  }>()
  const [finalizedNotice, setFinalizedNotice] = useState<string>()
  const [finalizeError, setFinalizeError] = useState<string>()
  const [isDownloading, setIsDownloading] = useState(false)
  // MB sales staff also issue the clinic's warranty certificate and invitation letter from here.
  const [documentKind, setDocumentKind] = useState<'plan' | 'warranty' | 'invitation'>('plan')
  const defaults = useMemo(
    () => (initialReport?.clinicId === clinicId ? initialReport : createDefaultReport(clinicId)),
    [clinicId, initialReport],
  )
  const form = useForm<ReportData>({
    defaultValues: defaults,
    resolver: zodResolver(reportSchema) as Resolver<ReportData>,
    mode: 'onBlur',
  })
  const { isDirty } = form.formState
  const report = useWatch({ control: form.control }) as ReportData
  const preview = usePdfPreview(report)
  const clinic = clinicRegistry[clinicId]
  const isFinalizedCurrent = useMemo(() => {
    if (!finalized) return false
    const parsed = reportSchema.safeParse(report)
    return parsed.success && JSON.stringify(parsed.data) === finalized.snapshot
  }, [finalized, report])
  const scrollBehavior = (): ScrollBehavior =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

  // Finds the first invalid field's react-hook-form path (e.g. "patient.patientId") so a failed
  // Finalize can point the user straight at it instead of leaving a validation error buried in the
  // form with no visible feedback (the P1 "Patient ID rejected silently" QA finding).
  const firstErrorFieldName = (errors: object, prefix = ''): string | undefined => {
    for (const [key, value] of Object.entries(errors)) {
      if (!value || typeof value !== 'object') continue
      const path = prefix ? `${prefix}.${key}` : key
      if ('message' in value && 'type' in value) return path
      const nested = firstErrorFieldName(value as object, path)
      if (nested) return nested
    }
    return undefined
  }

  const download = async () => {
    if (!(await form.trigger())) {
      const fieldName = firstErrorFieldName(form.formState.errors)
      if (fieldName) {
        setMobilePanel('edit')
        form.setFocus(fieldName as never)
        window.requestAnimationFrame(() => {
          document
            .querySelector<HTMLElement>(`[name="${fieldName}"]`)
            ?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' })
        })
      }
      throw new Error(t('validation.fixHighlighted'))
    }
    setFinalizeError(undefined)
    setFinalizedNotice(undefined)
    const validated = reportSchema.parse(form.getValues())
    const snapshot = JSON.stringify(validated)
    let blob: Blob
    if (isE2EAuthBypass()) {
      const generated = await generateReport(validated)
      blob = new Blob([Uint8Array.from(generated.bytes)], { type: 'application/pdf' })
    } else if (finalized?.snapshot === snapshot && finalized.signedIn === Boolean(profile)) {
      blob = finalized.signedIn
        ? await downloadArchivedReport(finalized.report)
        : new Blob([Uint8Array.from(finalized.bytes)], { type: 'application/pdf' })
    } else {
      const publicName = salesIdentity?.fullName.trim() ?? ''
      const publicPhone = normalizePhone(salesIdentity?.phone ?? '')
      if (!profile && (publicName.length < 2 || !publicPhone)) {
        // Check identity before rendering the PDF and point at the field that needs it.
        const target = document.getElementById(publicName.length < 2 ? 'sales-identity-name' : 'sales-identity-phone')
        target?.focus()
        target?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' })
        throw new Error(t('sales.errors.identityRequired'))
      }
      const generated = await generateReport(validated)
      const archived = profile
        ? await finalizeReport(validated, generated.bytes, profile, parentReportId)
        : await finalizePublicReport(
            validated,
            generated.bytes,
            { fullName: publicName, phone: publicPhone! },
            parentReportId,
          )
      setFinalized({ report: archived, snapshot, bytes: generated.bytes, signedIn: Boolean(profile) })
      setFinalizedNotice(profile ? t('sales.finalized') : t('sales.finalizedPublic'))
      blob = profile
        ? await downloadArchivedReport(archived)
        : new Blob([Uint8Array.from(generated.bytes)], { type: 'application/pdf' })
    }
    saveBlob(blob, reportFilename(clinicId, report.patient.name, report.patient.reportDate, report.document.locale))
  }

  const handleDownload = async () => {
    if (isDownloading) return
    setIsDownloading(true)
    setFinalizeError(undefined)
    try {
      await download()
    } catch (caught) {
      setFinalizeError(errorText(caught, t, 'sales.errors.finalizeFailed'))
    } finally {
      setIsDownloading(false)
    }
  }

  const reset = () => form.reset(createDefaultReport(clinicId))
  const clearPatient = () => {
    const blankPatient =
      clinicId === 'aksu'
        ? { reportDate: '', name: '', age: 0, phone: '' }
        : { reportDate: '', name: '', age: 0, phone: '', patientId: '' }
    form.setValue('patient', blankPatient as ReportData['patient'], { shouldDirty: true })
  }

  const requestSwitchClinic = () => {
    if (isDirty) setDialog('switchClinic')
    else onSwitchClinic()
  }

  return (
    <div className="flex flex-1 flex-col bg-parchment text-ink lg:min-h-0" dir={isRtl(interfaceLocale) ? 'rtl' : 'ltr'}>
      <header className="border-b border-stone-300 bg-ink text-white">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full border border-gold/70 text-gold">
              <FileText size={20} />
            </span>
            <div>
              <h1 className="text-lg font-bold tracking-tight">{t('app.title')}</h1>
              <p className="text-xs text-stone-300">{clinic.displayName}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              className="!border-stone-600 !bg-stone-800 !text-white hover:!bg-stone-700"
              onClick={requestSwitchClinic}
            >
              <ArrowLeftRight size={16} />
              {t('actions.switchClinic')}
            </Button>
            <label className="flex items-center gap-2 text-xs font-semibold text-stone-200">
              <Languages size={16} />
              <span className="sr-only sm:not-sr-only">{t('fields.interfaceLanguage')}</span>
              <Select
                className="interface-language-select h-10 !w-36 border-stone-600 !bg-stone-800 !text-white"
                value={interfaceLocale}
                onChange={(event) => onInterfaceLocaleChange(event.target.value as Locale)}
              >
                {locales.map((locale) => (
                  <option key={locale} value={locale}>
                    {t(`languages.${locale}`)}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        </div>
      </header>
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-950">
        <ShieldCheck className="me-2 inline" size={15} />
        {t('app.privacy')}
      </div>
      {clinicId === 'mb-dental' && (
        <nav aria-label={t('documents.switchLabel')} className="border-b border-stone-300 bg-white px-4 py-2 sm:px-7">
          <Tabs
            value={documentKind}
            onValueChange={(value) => setDocumentKind(value as typeof documentKind)}
            className="mx-auto max-w-[1800px]"
          >
            <TabsList className="!inline-grid w-full grid-cols-3 sm:w-auto">
              {(['plan', 'warranty', 'invitation'] as const).map((kind) => (
                <TabsTrigger
                  key={kind}
                  value={kind}
                  aria-controls="clinic-document"
                  className="px-1.5 text-xs leading-tight sm:whitespace-nowrap sm:px-4 sm:text-sm"
                >
                  {t(`documents.${kind}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </nav>
      )}
      <div id="clinic-document" className="contents">
        {documentKind !== 'plan' ? (
          <MbDocumentPanel kind={documentKind} profile={profile} patientName={report.patient.name ?? ''} />
        ) : (
          <>
            {preview.usedFallback && report.document.locale !== 'en' && (
              <div
                role="status"
                className="border-b border-stone-300 bg-stone-100 px-4 py-2 text-center text-xs font-medium text-ink"
              >
                {t('app.templateFallback')}
              </div>
            )}
            <Tabs value={mobilePanel} onValueChange={setMobilePanel} className="mx-auto max-w-md px-4 pt-4 lg:hidden">
              <TabsList>
                <TabsTrigger value="edit" aria-controls="workspace-editor">
                  {t('actions.showEditor')}
                </TabsTrigger>
                <TabsTrigger value="preview" aria-controls="workspace-preview">
                  {t('actions.showPreview')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <main className="mx-auto grid w-full max-w-[1800px] flex-1 lg:min-h-0 lg:grid-cols-[minmax(520px,45%)_1fr] lg:grid-rows-[minmax(0,1fr)]">
              <FormProvider {...form}>
                <section
                  id="workspace-editor"
                  className={`${mobilePanel === 'preview' ? 'hidden' : 'block'} overflow-y-auto border-e border-stone-300 bg-white lg:block`}
                  aria-label={t('actions.showEditor')}
                >
                  <form onSubmit={(event) => event.preventDefault()}>
                    {clinicId === 'aksu' ? <AksuReportForm /> : <MbReportForm />}
                  </form>
                </section>
                <section
                  id="workspace-preview"
                  className={`${mobilePanel === 'edit' ? 'hidden' : 'block'} paper-texture min-w-0 overflow-y-auto bg-stone-200 lg:block`}
                  aria-label={t('sections.pdfPreview')}
                >
                  <PdfPreview
                    url={preview.url}
                    loading={preview.isGenerating}
                    error={preview.error}
                    onRetry={() => void preview.regenerate()}
                  />
                </section>
              </FormProvider>
            </main>
            <footer className="sticky bottom-0 z-30 border-t border-stone-300 bg-white px-4 py-3 shadow-[0_-8px_25px_rgb(0_0_0/8%)] sm:px-7">
              <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setDialog('reset')}>
                    <RotateCcw size={16} />
                    {t('actions.reset')}
                  </Button>
                  <Button
                    variant="outline"
                    aria-label={t('actions.clear')}
                    title={t('actions.clear')}
                    onClick={() => setDialog('clear')}
                  >
                    <Trash2 size={16} />
                    <span className="hidden sm:inline">{t('actions.clear')}</span>
                  </Button>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      void preview.regenerate()
                      setMobilePanel('preview')
                    }}
                  >
                    <FileText size={16} />
                    {t('actions.preview')}
                  </Button>
                  <Button
                    variant="primary"
                    disabled={isDownloading || preview.isGenerating || !preview.blob}
                    aria-busy={isDownloading}
                    onClick={() => void handleDownload()}
                  >
                    {isDownloading ? (
                      <>
                        <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" />
                        {t('status.finalizing')}
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        {isFinalizedCurrent
                          ? t('actions.download')
                          : t('sales.finalizeAndDownload', { action: t('actions.download') })}
                      </>
                    )}
                  </Button>
                </div>
                {finalizeError && (
                  <p role="alert" className="basis-full text-end text-sm text-red-700">
                    {finalizeError}
                  </p>
                )}
                <p role="status" className="basis-full text-end text-sm text-stone-700 empty:sr-only">
                  {finalizedNotice}
                </p>
              </div>
            </footer>
          </>
        )}
      </div>
      <ConfirmDialog
        open={dialog === 'reset'}
        onOpenChange={(open) => !open && setDialog(undefined)}
        title={t('dialog.resetTitle')}
        body={t('dialog.resetBody')}
        confirmLabel={t('actions.reset')}
        cancelLabel={t('actions.cancel')}
        onConfirm={reset}
      />
      <ConfirmDialog
        open={dialog === 'clear'}
        onOpenChange={(open) => !open && setDialog(undefined)}
        title={t('dialog.clearTitle')}
        body={t('dialog.clearBody')}
        confirmLabel={t('actions.clear')}
        cancelLabel={t('actions.cancel')}
        onConfirm={clearPatient}
      />
      <ConfirmDialog
        open={dialog === 'switchClinic'}
        onOpenChange={(open) => !open && setDialog(undefined)}
        title={t('dialog.switchClinicTitle')}
        body={t('dialog.switchClinicBody')}
        confirmLabel={t('actions.switchClinic')}
        cancelLabel={t('actions.cancel')}
        onConfirm={onSwitchClinic}
      />
    </div>
  )
}
