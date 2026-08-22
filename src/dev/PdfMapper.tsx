import { Copy, Move } from 'lucide-react'
import * as pdfjs from 'pdfjs-dist'
import { useEffect, useRef, useState } from 'react'
import { pdfCoordinates, type CoordinateField, type FieldBox } from '../pdf/coordinates'
import { Button, Field, Input, Select } from '../components/ui'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

const initial: Record<CoordinateField, FieldBox> = {
  'page1.reportDate': { ...pdfCoordinates.page1.reportDate }, 'page1.patientName': { ...pdfCoordinates.page1.patientName },
  'page1.age': { ...pdfCoordinates.page1.age }, 'page1.phone': { ...pdfCoordinates.page1.phone },
}

export function PdfMapper() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [coordinates, setCoordinates] = useState(initial)
  const [selected, setSelected] = useState<CoordinateField>('page1.patientName')
  const field = coordinates[selected]
  const scale = 1.1
  useEffect(() => { void (async () => { const pdf = await pdfjs.getDocument({ url: './templates/en.pdf' }).promise; const page = await pdf.getPage(1); const viewport = page.getViewport({ scale }); const element = canvas.current; if (!element) return; element.width = viewport.width; element.height = viewport.height; const context = element.getContext('2d'); if (context) await page.render({ canvas: element, canvasContext: context, viewport }).promise })() }, [])
  const update = (key: keyof FieldBox, value: string) => setCoordinates((current) => ({ ...current, [selected]: { ...current[selected], [key]: key === 'alignment' ? value : Number(value) } }))
  const exportCoordinates = async () => navigator.clipboard.writeText(JSON.stringify(coordinates, null, 2))
  return <main className="min-h-screen bg-stone-200 p-6 text-ink"><header className="mx-auto mb-5 flex max-w-7xl items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-gold">Development tool</p><h1 className="text-2xl font-bold">PDF coordinate mapper</h1></div><Button className="bg-ink text-white" onClick={() => void exportCoordinates()}><Copy size={16} />Copy object</Button></header><div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1fr_310px]"><div className="overflow-auto rounded-lg bg-stone-300 p-4"><div className="relative mx-auto w-fit bg-white shadow-paper"><canvas ref={canvas} />{field && <div className="pointer-events-none absolute border-2 border-red-500 bg-red-500/10" style={{ left: field.x * scale, bottom: field.y * scale, width: field.width * scale, height: field.height * scale }}><span className="absolute -top-6 left-0 whitespace-nowrap bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{selected}</span></div>}</div></div><aside className="rounded-lg bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2 font-bold"><Move size={17} />Selected field</div><Field label="Field"><Select value={selected} onChange={(event) => setSelected(event.target.value as CoordinateField)}>{Object.keys(coordinates).map((key) => <option key={key}>{key}</option>)}</Select></Field><div className="mt-4 grid grid-cols-2 gap-3">{(['x', 'y', 'width', 'height', 'fontSize'] as const).map((key) => <Field key={key} label={key}><Input type="number" step="0.5" value={field?.[key]} onChange={(event) => update(key, event.target.value)} /></Field>)}</div><Field label="alignment" className="mt-3"><Select value={field?.alignment} onChange={(event) => update('alignment', event.target.value)}><option>left</option><option>center</option><option>right</option></Select></Field><pre className="mt-5 overflow-auto rounded-md bg-stone-950 p-3 text-[10px] text-stone-100">{JSON.stringify(field, null, 2)}</pre></aside></div></main>
}
