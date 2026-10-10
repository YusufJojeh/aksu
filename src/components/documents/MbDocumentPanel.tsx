import { Download, Info, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { generateMbDocument, mbDocumentFilename, suggestCertificateNo, unsupportedFields, type InvitationData, type MbDocumentData, type MbDocumentKind, type WarrantyData } from '../../pdf/documents/mbDocuments'
import { PdfPreview } from '../PdfPreview'
import type { EmployeeProfile } from '../../auth/types'
import { isE2EAuthBypass } from '../../auth/AuthProvider'
import { saveBlob } from '../../lib/download'
import { archiveDocument } from '../../lib/operations'
import { Button, Field, Input, Tabs, TabsList, TabsTrigger } from '../ui'

const CONTACT_KEY = 'mb_document_contact'
type Contact = Pick<InvitationData, 'phone' | 'email' | 'website'>

function today(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// Clinic contact lines repeat on every letter, so they are remembered per device (not patient data).
// Taken from the clinic's own treatment-plan artwork (public/templates/mb-dental/*.pdf). No clinic
// email is printed anywhere in that artwork, so the email starts empty until staff enter one.
const CLINIC_CONTACT: Contact = { phone: '+90 555 066 94 75', email: '', website: 'mbdentalturkey.com' }

function loadContact(): Contact {
  try {
    const stored = JSON.parse(localStorage.getItem(CONTACT_KEY) ?? 'null') as Partial<Contact> | null
    return { phone: stored?.phone || CLINIC_CONTACT.phone, email: stored?.email || CLINIC_CONTACT.email, website: stored?.website || CLINIC_CONTACT.website }
  } catch { return { ...CLINIC_CONTACT } }
}

function saveContact(contact: Contact) {
  try { localStorage.setItem(CONTACT_KEY, JSON.stringify(contact)) } catch { /* storage unavailable: nothing to remember */ }
}

function useDocumentPreview(document: MbDocumentData, delay = 300) {
  const [url, setUrl] = useState<string>()
  const [blob, setBlob] = useState<Blob>()
  const [isGenerating, setIsGenerating] = useState(true)
  const [error, setError] = useState<Error>()
  const generation = useRef(0)
  const snapshot = JSON.stringify(document)

  useEffect(() => {
    const current = ++generation.current
    setIsGenerating(true)
    const timeout = window.setTimeout(() => {
      void generateMbDocument(JSON.parse(snapshot) as MbDocumentData).then((bytes) => {
        if (current !== generation.current) return
        const next = new Blob([Uint8Array.from(bytes)], { type: 'application/pdf' })
        setBlob(next); setError(undefined)
        setUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return URL.createObjectURL(next) })
      }).catch((caught: unknown) => {
        if (current === generation.current) setError(caught instanceof Error ? caught : new Error(String(caught)))
      }).finally(() => { if (current === generation.current) setIsGenerating(false) })
    }, delay)
    return () => window.clearTimeout(timeout)
  }, [delay, snapshot])

  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  return { url, blob, isGenerating, error }
}

function TextField({ name, label, value, onChange, invalid, type = 'text', multiline, hint, action }: {
  name: string; label: string; value: string; onChange: (value: string) => void; invalid?: string; type?: string; multiline?: boolean; hint?: string; action?: React.ReactNode
}) {
  const id = `mb-doc-${name}`
  return <Field label={label} error={invalid} className={multiline ? 'sm:col-span-2' : undefined}>
    <div className="flex gap-2">
      {multiline
        ? <textarea id={id} name={name} rows={3} maxLength={300} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(invalid)} className="min-h-[88px] w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30" />
        : <Input id={id} name={name} type={type} value={value} maxLength={120} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(invalid)} />}
      {action}
    </div>
    {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
  </Field>
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset className="rounded-xl border border-stone-200 bg-stone-50/60 p-4">
    <legend className="px-1 text-xs font-bold uppercase tracking-wide text-amber-800">{title}</legend>
    <div className="grid gap-4 sm:grid-cols-2">{children}</div>
  </fieldset>
}

export function MbDocumentPanel({ kind, patientName, profile }: { kind: MbDocumentKind; patientName: string; profile?: EmployeeProfile }) {
  const { t } = useTranslation()
  const [mobilePanel, setMobilePanel] = useState('edit')
  const [warranty, setWarranty] = useState<WarrantyData>(() => ({ patientName, treatmentDate: today(), certificateNo: suggestCertificateNo(), treatmentPerformed: '', issueDate: today() }))
  const [invitation, setInvitation] = useState<InvitationData>(() => ({
    letterDate: today(), patientName, passportNumber: '', nationality: '', treatmentPlan: '', arrivalDate: '', startDate: '', completionDate: '', ...loadContact(),
  }))
  const document = useMemo<MbDocumentData>(() => kind === 'warranty' ? { kind, data: warranty } : { kind, data: invitation }, [kind, warranty, invitation])
  const preview = useDocumentPreview(document)
  const invalid = new Set(unsupportedFields(document))
  const latinOnly = t('documents.latinOnly')
  const [downloadError, setDownloadError] = useState<string>()
  const [archiving, setArchiving] = useState(false)
  // Re-downloading unchanged content must not archive a second copy.
  const archivedSnapshot = useRef<string | undefined>(undefined)
  const canArchive = Boolean(profile) && !isE2EAuthBypass()

  // The patient name is shared, so switching between the two documents never means retyping it.
  const setPatientName = (value: string) => {
    setWarranty((current) => ({ ...current, patientName: value }))
    setInvitation((current) => ({ ...current, patientName: value }))
  }
  const setW = (key: keyof WarrantyData) => (value: string) => key === 'patientName' ? setPatientName(value) : setWarranty((current) => ({ ...current, [key]: value }))
  const setI = (key: keyof InvitationData) => (value: string) => {
    if (key === 'patientName') { setPatientName(value); return }
    const next = { ...invitation, [key]: value }
    setInvitation(next)
    if (key === 'phone' || key === 'email' || key === 'website') saveContact({ phone: next.phone, email: next.email, website: next.website })
  }
  const field = (key: string) => ({ name: key, label: t(`documents.fields.${key}`), invalid: invalid.has(key) ? latinOnly : undefined })

  const download = async () => {
    setDownloadError(undefined)
    if (invalid.size) { setDownloadError(latinOnly); return }
    if (!preview.blob) return
    const snapshot = JSON.stringify(document)
    if (canArchive && profile && archivedSnapshot.current !== snapshot) {
      setArchiving(true)
      try {
        await archiveDocument(document, new Uint8Array(await preview.blob.arrayBuffer()), profile)
        archivedSnapshot.current = snapshot
      } catch (caught) {
        // Never hand out an unarchived copy to a signed-in employee: the archive is the record.
        setDownloadError(caught instanceof Error ? caught.message : t('documents.archiveFailed'))
        return
      } finally { setArchiving(false) }
    }
    saveBlob(preview.blob, mbDocumentFilename(document))
  }

  return <>
    <Tabs value={mobilePanel} onValueChange={setMobilePanel} className="mx-auto max-w-md px-4 pt-4 lg:hidden"><TabsList><TabsTrigger value="edit">{t('actions.showEditor')}</TabsTrigger><TabsTrigger value="preview">{t('actions.showPreview')}</TabsTrigger></TabsList></Tabs>
    <main className="mx-auto grid w-full max-w-[1800px] flex-1 lg:min-h-0 lg:grid-cols-[minmax(520px,45%)_1fr] lg:grid-rows-[minmax(0,1fr)]">
      <section className={`${mobilePanel === 'preview' ? 'hidden' : 'block'} overflow-y-auto border-e border-stone-300 bg-white lg:block`} aria-label={t('actions.showEditor')}>
        <form className="space-y-5 p-4 sm:p-7" onSubmit={(event) => event.preventDefault()}>
          <div>
            <h2 className="text-xl font-bold text-ink">{t(`documents.${kind}`)}</h2>
            <p className="mt-1 flex items-start gap-2 text-xs text-stone-500"><Info size={14} className="mt-0.5 shrink-0" />{t('documents.blankHint')}</p>
          </div>
          {kind === 'warranty' ? <>
            <Group title={t('documents.sections.patient')}>
              <TextField {...field('patientName')} value={warranty.patientName} onChange={setW('patientName')} />
              <TextField {...field('treatmentDate')} type="date" value={warranty.treatmentDate} onChange={setW('treatmentDate')} />
              <TextField {...field('certificateNo')} value={warranty.certificateNo} onChange={setW('certificateNo')}
                action={<Button size="icon" aria-label={t('documents.newNumber')} title={t('documents.newNumber')} onClick={() => setW('certificateNo')(suggestCertificateNo())}><RefreshCw size={16} /></Button>} />
              <TextField {...field('issueDate')} type="date" value={warranty.issueDate} onChange={setW('issueDate')} />
              <TextField {...field('treatmentPerformed')} multiline value={warranty.treatmentPerformed} onChange={setW('treatmentPerformed')} />
            </Group>
          </> : <>
            <Group title={t('documents.sections.patient')}>
              <TextField {...field('letterDate')} type="date" value={invitation.letterDate} onChange={setI('letterDate')} />
              <TextField {...field('patientName')} value={invitation.patientName} onChange={setI('patientName')} />
              <TextField {...field('passportNumber')} value={invitation.passportNumber} onChange={setI('passportNumber')} />
              <TextField {...field('nationality')} value={invitation.nationality} onChange={setI('nationality')} />
              <TextField {...field('treatmentPlan')} multiline value={invitation.treatmentPlan} onChange={setI('treatmentPlan')} />
            </Group>
            <Group title={t('documents.sections.dates')}>
              <TextField {...field('arrivalDate')} type="date" value={invitation.arrivalDate} onChange={setI('arrivalDate')} />
              <TextField {...field('startDate')} type="date" value={invitation.startDate} onChange={setI('startDate')} />
              <TextField {...field('completionDate')} type="date" value={invitation.completionDate} onChange={setI('completionDate')} />
            </Group>
            <Group title={t('documents.sections.contact')}>
              <TextField {...field('phone')} type="tel" value={invitation.phone} onChange={setI('phone')} />
              <TextField {...field('email')} type="email" value={invitation.email} onChange={setI('email')} />
              <TextField {...field('website')} value={invitation.website} onChange={setI('website')} hint={t('documents.contactRemembered')} />
            </Group>
          </>}
        </form>
      </section>
      <section className={`${mobilePanel === 'edit' ? 'hidden' : 'block'} paper-texture min-w-0 overflow-y-auto bg-stone-200 lg:block`} aria-label={t('sections.pdfPreview')}>
        <PdfPreview url={preview.url} loading={preview.isGenerating} error={preview.error} />
      </section>
    </main>
    <footer className="sticky bottom-0 z-30 border-t border-stone-300 bg-white/95 px-4 py-3 shadow-[0_-8px_25px_rgb(0_0_0/8%)] backdrop-blur sm:px-7">
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs text-stone-500"><Info size={14} />{canArchive ? t('documents.archived') : t('documents.notArchived')}</p>
        <div className="flex items-center gap-2">
          {downloadError && <span role="alert" className="max-w-sm text-xs text-red-700">{downloadError}</span>}
          <Button variant="primary" disabled={preview.isGenerating || archiving || !preview.blob} aria-busy={preview.isGenerating || archiving} onClick={() => void download()}><Download size={16} />{t('documents.download')}</Button>
        </div>
      </div>
    </footer>
  </>
}
