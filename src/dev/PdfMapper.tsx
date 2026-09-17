import { Copy, Move } from 'lucide-react'
import * as pdfjs from 'pdfjs-dist'
import { useEffect, useMemo, useRef, useState } from 'react'
import { clinicIds, type ClinicId } from '../clinics/types'
import { aksuPdfCoordinatesByLocale } from '../pdf/profiles/aksu'
import type { FieldBox } from '../pdf/profiles/shared/fieldBox'
import { enMbPdfCoordinates } from '../pdf/profiles/mb/en'
import { frMbPdfCoordinates } from '../pdf/profiles/mb/fr'
import { deMbPdfCoordinates } from '../pdf/profiles/mb/de'
import { esMbPdfCoordinates } from '../pdf/profiles/mb/es'
import { arMbPdfCoordinates } from '../pdf/profiles/mb/ar'
import type { MbLocale } from '../pdf/profiles/mb'
import { Button, Field, Input, Select } from '../components/ui'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

const mbCoordinatesByLocale: Record<MbLocale, typeof enMbPdfCoordinates> = {
  en: enMbPdfCoordinates, fr: frMbPdfCoordinates, de: deMbPdfCoordinates, es: esMbPdfCoordinates, ar: arMbPdfCoordinates,
}

type AksuLocale = keyof typeof aksuPdfCoordinatesByLocale

function flattenAksu(locale: AksuLocale): Record<string, FieldBox> {
  const coordinates = aksuPdfCoordinatesByLocale[locale]
  const fields: Record<string, FieldBox> = {
    'page1.reportDate': { ...coordinates.page1.reportDate }, 'page1.patientName': { ...coordinates.page1.patientName },
    'page1.age': { ...coordinates.page1.age }, 'page1.phone': { ...coordinates.page1.phone },
    'page2.firstVisit.total': { ...coordinates.page2.firstVisit.total },
    'page2.discount.sentence': { ...coordinates.page2.discount.sentence }, 'page2.discount.price': { ...coordinates.page2.discount.price },
    'page2.secondVisit.heading': { ...coordinates.page2.secondVisit.heading }, 'page2.secondVisit.total': { ...coordinates.page2.secondVisit.total },
  }
  for (const [key, point] of Object.entries(coordinates.page2.assessment)) fields[`page2.assessment.${key}`] = { x: point.x - 10, y: point.y - 10, width: 20, height: 20, fontSize: 10, minFontSize: 6, alignment: 'center' }
  for (const visit of ['firstVisit', 'secondVisit'] as const) coordinates.page2[visit].rows.forEach((row, index) => {
    for (const [cell, field] of Object.entries(row)) fields[`page2.${visit}.rows.${index}.${cell}`] = { ...field }
  })
  return fields
}

function flattenMb(locale: MbLocale): Record<string, FieldBox> {
  const coordinates = mbCoordinatesByLocale[locale]
  const fields: Record<string, FieldBox> = {
    'cover.patientName': { ...coordinates.cover.patientName }, 'cover.reportDate': { ...coordinates.cover.reportDate },
    'cover.age': { ...coordinates.cover.age }, 'cover.patientId': { ...coordinates.cover.patientId }, 'cover.phone': { ...coordinates.cover.phone },
    'treatmentPlan.firstVisit.total': { ...coordinates.treatmentPlan.firstVisit.total },
    'treatmentPlan.secondVisit.total': { ...coordinates.treatmentPlan.secondVisit.total },
  }
  for (const [key, checkbox] of Object.entries(coordinates.oralHealth.currentCondition)) fields[`oralHealth.currentCondition.${key}`] = { x: checkbox.centerX - checkbox.width / 2, y: checkbox.centerY - checkbox.height / 2, width: checkbox.width, height: checkbox.height, fontSize: 10, minFontSize: 6, alignment: 'center' }
  for (const [key, checkbox] of Object.entries(coordinates.oralHealth.recommendedTreatments)) fields[`oralHealth.recommendedTreatments.${key}`] = { x: checkbox.centerX - checkbox.width / 2, y: checkbox.centerY - checkbox.height / 2, width: checkbox.width, height: checkbox.height, fontSize: 10, minFontSize: 6, alignment: 'center' }
  for (const visit of ['firstVisit', 'secondVisit'] as const) coordinates.treatmentPlan[visit].rows.forEach((row, index) => {
    for (const [cell, field] of Object.entries(row)) fields[`treatmentPlan.${visit}.rows.${index}.${cell}`] = { ...field }
  })
  return fields
}

const localesByClinic: Record<ClinicId, string[]> = { aksu: ['en', 'ar'], 'mb-dental': ['en', 'fr', 'de', 'ar'] }
const pageCountByClinic: Record<ClinicId, number> = { aksu: 2, 'mb-dental': 3 }

function flatten(clinicId: ClinicId, locale: string): Record<string, FieldBox> {
  return clinicId === 'aksu' ? flattenAksu(locale as AksuLocale) : flattenMb(locale as MbLocale)
}

export function PdfMapper() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [clinicId, setClinicId] = useState<ClinicId>('mb-dental')
  const [locale, setLocale] = useState('en')
  const initial = useMemo(() => flatten(clinicId, locale), [clinicId, locale])
  const [coordinates, setCoordinates] = useState(initial)
  const [selected, setSelected] = useState(Object.keys(initial)[0] ?? '')
  const field = coordinates[selected]
  const pageNumber = clinicId === 'aksu' ? (selected.startsWith('page2.') ? 2 : 1) : (selected.startsWith('oralHealth.') ? 2 : selected.startsWith('treatmentPlan.') ? 3 : 1)
  const scale = 1.1

  useEffect(() => { setCoordinates(initial); setSelected(Object.keys(initial)[0] ?? '') }, [initial])
  useEffect(() => {
    const availableLocales = localesByClinic[clinicId]
    if (!availableLocales.includes(locale)) setLocale(availableLocales[0]!)
  }, [clinicId, locale])
  useEffect(() => { void (async () => {
    if (pageNumber > pageCountByClinic[clinicId]) return
    const loadingTask = pdfjs.getDocument({ url: `/templates/${clinicId}/${locale}.pdf` })
    const pdf = await loadingTask.promise
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale })
    const element = canvas.current
    if (!element) return
    element.width = viewport.width; element.height = viewport.height
    const context = element.getContext('2d')
    if (context) await page.render({ canvas: element, canvasContext: context, viewport }).promise
    await loadingTask.destroy()
  })() }, [clinicId, locale, pageNumber])

  const update = (key: keyof FieldBox, value: string) => setCoordinates((current) => ({ ...current, [selected]: { ...current[selected]!, [key]: key === 'alignment' || key === 'direction' ? value : Number(value) } }))
  const exportCoordinates = async () => navigator.clipboard.writeText(JSON.stringify(coordinates, null, 2))

  return <main className="min-h-screen bg-stone-200 p-6 text-ink"><header className="mx-auto mb-5 flex max-w-7xl items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-gold">Development tool</p><h1 className="text-2xl font-bold">PDF coordinate mapper</h1></div><Button className="bg-ink text-white" onClick={() => void exportCoordinates()}><Copy size={16} />Copy object</Button></header><div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1fr_310px]"><div className="overflow-auto rounded-lg bg-stone-300 p-4"><div className="relative mx-auto w-fit bg-white shadow-paper"><canvas ref={canvas} />{field && <div className="pointer-events-none absolute border-2 border-red-500 bg-red-500/10" style={{ left: field.x * scale, bottom: field.y * scale, width: field.width * scale, height: field.height * scale }}><span className="absolute -top-6 left-0 whitespace-nowrap bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{selected}</span></div>}</div></div><aside className="rounded-lg bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2 font-bold"><Move size={17} />Selected field</div><Field label="Clinic"><Select value={clinicId} onChange={(event) => setClinicId(event.target.value as ClinicId)}>{clinicIds.map((id) => <option key={id} value={id}>{id}</option>)}</Select></Field><Field label="Template" className="mt-3"><Select value={locale} onChange={(event) => setLocale(event.target.value)}>{localesByClinic[clinicId].map((code) => <option key={code} value={code}>{code}</option>)}</Select></Field><Field label="Field" className="mt-3"><Select value={selected} onChange={(event) => setSelected(event.target.value)}>{Object.keys(coordinates).map((key) => <option key={key}>{key}</option>)}</Select></Field><div className="mt-4 grid grid-cols-2 gap-3">{(['x', 'y', 'width', 'height', 'fontSize'] as const).map((key) => <Field key={key} label={key}><Input type="number" step="0.1" value={field?.[key]} onChange={(event) => update(key, event.target.value)} /></Field>)}</div><Field label="alignment" className="mt-3"><Select value={field?.alignment} onChange={(event) => update('alignment', event.target.value)}><option>left</option><option>center</option><option>right</option></Select></Field><pre className="mt-5 overflow-auto rounded-md bg-stone-950 p-3 text-[10px] text-stone-100">{JSON.stringify(field, null, 2)}</pre></aside></div></main>
}
