import { zodResolver } from '@hookform/resolvers/zod'
import { Download, FileText, Languages, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { FormProvider, useForm, type Resolver } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { createDefaultReport, locales, reportSchema, type Locale, type ReportData } from './domain/report'
import { isRtl } from './lib/locale'
import { reportFilename } from './lib/filename'
import { usePdfPreview } from './hooks/usePdfPreview'
import { generateReport } from './pdf/generateReport'
import { ReportForm } from './components/ReportForm'
import { PdfPreview } from './components/PdfPreview'
import { Button, ConfirmDialog, Select, Tabs, TabsList, TabsTrigger } from './components/ui'

export default function App() {
  const { t, i18n } = useTranslation()
  const [interfaceLocale, setInterfaceLocale] = useState<Locale>('en')
  const [mobilePanel, setMobilePanel] = useState('edit')
  const [dialog, setDialog] = useState<'reset' | 'clear'>()
  const defaults = useMemo(() => createDefaultReport(), [])
  const form = useForm<ReportData>({ defaultValues: defaults, resolver: zodResolver(reportSchema) as Resolver<ReportData>, mode: 'onBlur' })
  const report = form.watch()
  const preview = usePdfPreview(report)

  const changeInterfaceLanguage = (locale: Locale) => {
    setInterfaceLocale(locale)
    void i18n.changeLanguage(locale)
    document.documentElement.lang = locale
    document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr'
  }

  const download = async () => {
    if (!await form.trigger()) return
    const result = await generateReport(report)
    const url = URL.createObjectURL(new Blob([result.bytes], { type: 'application/pdf' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = reportFilename(report.patient.name, report.patient.reportDate, report.document.locale)
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const reset = () => form.reset(createDefaultReport())
  const clearPatient = () => form.setValue('patient', { reportDate: '', name: '', age: 0, phone: '' }, { shouldDirty: true })

  return <div className="min-h-screen bg-parchment text-ink" dir={isRtl(interfaceLocale) ? 'rtl' : 'ltr'}>
    <header className="border-b border-stone-300 bg-ink text-white">
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-7">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full border border-gold/70 text-gold"><FileText size={20} /></span><div><h1 className="text-lg font-bold tracking-tight">{t('app.title')}</h1><p className="text-xs text-stone-300">{t('app.subtitle')}</p></div></div>
        <label className="flex items-center gap-2 text-xs font-semibold text-stone-200"><Languages size={16} /><span className="sr-only sm:not-sr-only">{t('fields.interfaceLanguage')}</span><Select className="h-9 min-w-32 border-stone-600 bg-stone-800 text-white" value={interfaceLocale} onChange={(event) => changeInterfaceLanguage(event.target.value as Locale)}>{locales.map((locale) => <option key={locale} value={locale}>{t(`languages.${locale}`)}</option>)}</Select></label>
      </div>
    </header>
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-950"><ShieldCheck className="me-2 inline" size={15} />{t('app.privacy')}</div>
    {preview.usedFallback && report.document.locale !== 'en' && <div role="status" className="border-b border-blue-200 bg-blue-50 px-4 py-2 text-center text-xs font-medium text-blue-950">{t('app.templateFallback')}</div>}
    <Tabs value={mobilePanel} onValueChange={setMobilePanel} className="mx-auto max-w-md px-4 pt-4 lg:hidden"><TabsList><TabsTrigger value="edit">{t('actions.showEditor')}</TabsTrigger><TabsTrigger value="preview">{t('actions.showPreview')}</TabsTrigger></TabsList></Tabs>
    <main className="mx-auto grid max-w-[1800px] lg:h-[calc(100vh-137px)] lg:grid-cols-[minmax(520px,45%)_1fr]">
      <FormProvider {...form}>
        <section className={`${mobilePanel === 'preview' ? 'hidden' : 'block'} overflow-y-auto border-e border-stone-300 bg-white lg:block`} aria-label={t('actions.showEditor')}><form onSubmit={(event) => event.preventDefault()}><ReportForm /></form></section>
        <section className={`${mobilePanel === 'edit' ? 'hidden' : 'block'} min-w-0 overflow-y-auto bg-stone-200 lg:block`} aria-label={t('sections.pdfPreview')}><PdfPreview url={preview.url} loading={preview.isGenerating} error={preview.error} /></section>
      </FormProvider>
    </main>
    <footer className="sticky bottom-0 z-30 border-t border-stone-300 bg-white/95 px-4 py-3 shadow-[0_-8px_25px_rgb(0_0_0/8%)] backdrop-blur sm:px-7">
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2"><Button className="border border-stone-300 bg-white text-ink hover:bg-stone-100" onClick={() => setDialog('reset')}><RotateCcw size={16} />{t('actions.reset')}</Button><Button className="border border-stone-300 bg-white text-ink hover:bg-stone-100" onClick={() => setDialog('clear')}><Trash2 size={16} /><span className="hidden sm:inline">{t('actions.clear')}</span></Button></div>
        <div className="flex gap-2"><Button className="border border-ink bg-white text-ink hover:bg-stone-100" onClick={() => { void preview.regenerate(); setMobilePanel('preview') }}><FileText size={16} />{t('actions.preview')}</Button><Button className="bg-ink text-white hover:bg-stone-700" disabled={preview.isGenerating} onClick={() => void download()}><Download size={16} />{t('actions.download')}</Button></div>
      </div>
    </footer>
    <ConfirmDialog open={dialog === 'reset'} onOpenChange={(open) => !open && setDialog(undefined)} title={t('dialog.resetTitle')} body={t('dialog.resetBody')} confirmLabel={t('actions.confirm')} cancelLabel={t('actions.cancel')} onConfirm={reset} />
    <ConfirmDialog open={dialog === 'clear'} onOpenChange={(open) => !open && setDialog(undefined)} title={t('dialog.clearTitle')} body={t('dialog.clearBody')} confirmLabel={t('actions.confirm')} cancelLabel={t('actions.cancel')} onConfirm={clearPatient} />
  </div>
}
