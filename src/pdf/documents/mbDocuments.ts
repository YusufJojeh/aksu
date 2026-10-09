import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, StandardFonts, rgb, type PDFPage } from 'pdf-lib'
import { buildUnicodeFallback, embedUnicodeFallbackFonts, loadUnicodeFallbackFontBytes, type UnicodeFallback } from '../unicodeFallback'

// Fill-in documents MB Dental sales staff produce alongside the treatment plan. They are filled on
// top of the clinic's own artwork (public/templates/mb-dental/documents/*.pdf, metadata scrubbed).
// Every coordinate below was measured from those files with PyMuPDF and converted to pdf-lib space
// (origin bottom-left, page 612x792): `baseline` is the printed placeholder's text baseline, `x0`/`x1`
// the horizontal extent of its dots/underscores, and `maxX` how far a value may run before it would
// collide with other artwork on that line.

export type MbDocumentKind = 'warranty' | 'invitation'

export interface WarrantyData {
  patientName: string
  /** ISO yyyy-mm-dd */
  treatmentDate: string
  certificateNo: string
  treatmentPerformed: string
  /** ISO yyyy-mm-dd, printed above "Date:" on page 2 */
  issueDate: string
}

export interface InvitationData {
  /** ISO yyyy-mm-dd */
  letterDate: string
  patientName: string
  passportNumber: string
  nationality: string
  treatmentPlan: string
  arrivalDate: string
  startDate: string
  completionDate: string
  phone: string
  email: string
  website: string
}

export type MbDocumentData = { kind: 'warranty'; data: WarrantyData } | { kind: 'invitation'; data: InvitationData }

interface Slot { page: number; x0: number; x1: number; baseline: number; maxX: number; size: number }
interface MultiSlot extends Slot { lineGap: number; maxLines: number; minSize: number }

const PAGE_HEIGHT = 792
const top = (y: number) => PAGE_HEIGHT - y

// Cream sampled behind the warranty placeholders (uniform there; the photo sits further right/down).
const WARRANTY_PAPER = rgb(255 / 255, 252 / 255, 247 / 255)
const LETTER_PAPER = rgb(1, 1, 1)
const INK = rgb(0.05, 0.05, 0.05)

const warrantySlots = {
  patientName: { page: 0, x0: 129.8, x1: 238, baseline: top(289.6), maxX: 578, size: 12 },
  treatmentDate: { page: 0, x0: 147.4, x1: 244, baseline: top(312.5), maxX: 578, size: 12 },
  certificateNo: { page: 0, x0: 143.5, x1: 211, baseline: top(335.5), maxX: 578, size: 12 },
  treatmentPerformed: { page: 0, x0: 191.2, x1: 285, baseline: top(358.4), maxX: 578, size: 12, lineGap: 14.5, maxLines: 3, minSize: 9 },
  issueDate: { page: 1, x0: 240.3, x1: 416.3, baseline: top(512.3), maxX: 470, size: 15 },
} satisfies Record<keyof WarrantyData, Slot | MultiSlot>

const invitationSlots = {
  letterDate: { page: 0, x0: 75.3, x1: 174.1, baseline: top(212.1), maxX: 300, size: 11.5 },
  patientName: { page: 0, x0: 112, x1: 271.9, baseline: top(268.6), maxX: 567, size: 11.5 },
  passportNumber: { page: 0, x0: 134, x1: 282.7, baseline: top(290.3), maxX: 567, size: 11.5 },
  nationality: { page: 0, x0: 103.8, x1: 274.4, baseline: top(311.9), maxX: 567, size: 11.5 },
  // The value starts beside the "Treatment Plan:" label and wraps over the full-width rule below it.
  treatmentPlan: { page: 0, x0: 134, x1: 567.2, baseline: top(407.9), maxX: 567, size: 11, lineGap: 12.6, maxLines: 3, minSize: 8.5 },
  arrivalDate: { page: 0, x0: 110.8, x1: 275.8, baseline: top(472.8), maxX: 567, size: 11.5 },
  startDate: { page: 0, x0: 99.8, x1: 226.3, baseline: top(494.5), maxX: 567, size: 11.5 },
  completionDate: { page: 0, x0: 177.1, x1: 281.6, baseline: top(516.1), maxX: 567, size: 11.5 },
  phone: { page: 0, x0: 125.3, x1: 240.9, baseline: top(665.9), maxX: 415, size: 11.5 },
  email: { page: 0, x0: 82.1, x1: 241.7, baseline: top(692.2), maxX: 415, size: 11.5 },
  website: { page: 0, x0: 96, x1: 96, baseline: top(715.4), maxX: 380, size: 11.5 },
} satisfies Record<keyof InvitationData, Slot | MultiSlot>

// The plan's printed full-width rule sits one line below the label; it is erased with the label line.
const INVITATION_PLAN_RULE = { x0: 43.5, x1: 567.2, baseline: top(429.2) }

const DATE_FIELDS = new Set<string>(['treatmentDate', 'issueDate', 'letterDate', 'arrivalDate', 'startDate', 'completionDate'])

/** dd / mm / yyyy, the same shape as the warranty's printed "……. / …… / ……" placeholder. */
export function formatDocumentDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  return match ? `${match[3]} / ${match[2]} / ${match[1]}` : iso.trim()
}

export function suggestCertificateNo(now = new Date()): string {
  const stamp = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const suffix = String(Math.floor(now.getTime() / 1000) % 10_000).padStart(4, '0')
  return `MB-${now.getFullYear()}-${stamp}${suffix}`
}

const ARABIC = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/

/** Field keys whose value uses a script these English documents cannot print. */
export function unsupportedFields(document: MbDocumentData): string[] {
  return Object.entries(document.data).filter(([, value]) => typeof value === 'string' && ARABIC.test(value)).map(([key]) => key)
}

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function erase(page: PDFPage, x0: number, x1: number, baseline: number, size: number, paper: ReturnType<typeof rgb>) {
  // Dots/underscores sit between ~0.2em below and ~0.3em above the baseline; label text on the same
  // line always ends before x0, so the erase box never touches it.
  page.drawRectangle({ x: x0 - 0.5, y: baseline - size * 0.32, width: x1 - x0 + 2, height: size * 1.12, color: paper })
}

function fitSize(font: UnicodeFallback, text: string, width: number, size: number, minSize: number): number {
  let current = size
  while (current > minSize && font.widthOfTextAtSize(text, current) > width) current -= 0.25
  return current
}

function truncate(font: UnicodeFallback, text: string, width: number, size: number): string {
  if (font.widthOfTextAtSize(text, size) <= width) return text
  let cut = text
  while (cut.length > 1 && font.widthOfTextAtSize(`${cut}…`, size) > width) cut = cut.slice(0, -1)
  return `${cut.trimEnd()}…`
}

function drawSingle(page: PDFPage, font: UnicodeFallback, raw: string, slot: Slot, paper: ReturnType<typeof rgb>) {
  const text = clean(raw)
  if (!text) return // an empty field keeps its printed placeholder, so the sheet can still be hand-filled
  erase(page, slot.x0, slot.x1, slot.baseline, slot.size, paper)
  const x = slot.x0 + 3
  const width = slot.maxX - x
  const size = fitSize(font, text, width, slot.size, Math.max(8, slot.size - 3))
  font.draw(page, truncate(font, text, width, size), x, slot.baseline, size, INK)
}

/** Greedy word wrap; returns undefined when the text needs more than `maxLines` at this size. */
function wrap(font: UnicodeFallback, text: string, width: number, size: number, maxLines: number): string[] | undefined {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    const candidate = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= width) { line = candidate; continue }
    if (line) lines.push(line)
    line = word
    if (lines.length >= maxLines) return undefined
  }
  if (line) lines.push(line)
  return lines.length <= maxLines && lines.every((entry) => font.widthOfTextAtSize(entry, size) <= width) ? lines : undefined
}

function drawMulti(page: PDFPage, font: UnicodeFallback, raw: string, slot: MultiSlot, paper: ReturnType<typeof rgb>, extraErase?: { x0: number; x1: number; baseline: number }) {
  const text = clean(raw)
  if (!text) return
  erase(page, slot.x0, slot.x1, slot.baseline, slot.size, paper)
  if (extraErase) erase(page, extraErase.x0, extraErase.x1, extraErase.baseline, slot.size, paper)
  const x = slot.x0 + 2
  const width = slot.maxX - x
  let size = slot.size
  let lines = wrap(font, text, width, size, slot.maxLines)
  while (!lines && size > slot.minSize) { size -= 0.25; lines = wrap(font, text, width, size, slot.maxLines) }
  if (!lines) {
    // Still too long at the minimum size: keep what fits and mark the cut on the last line.
    lines = []
    let rest = text
    for (let index = 0; index < slot.maxLines && rest; index += 1) {
      const last = index === slot.maxLines - 1
      if (last) { lines.push(truncate(font, rest, width, size)); break }
      const words = rest.split(' ')
      let line = words.shift() ?? ''
      while (words.length && font.widthOfTextAtSize(`${line} ${words[0]}`, size) <= width) line = `${line} ${words.shift()}`
      lines.push(truncate(font, line, width, size))
      rest = words.join(' ')
    }
  }
  const gap = slot.lineGap * (size / slot.size)
  lines.forEach((line, index) => font.draw(page, line, x, slot.baseline - index * gap, size, INK))
}

export interface MbDocumentAssets { template: ArrayBuffer | Uint8Array; fallbackFonts: (ArrayBuffer | Uint8Array)[] }

export async function renderMbDocument(document: MbDocumentData, assets: MbDocumentAssets): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(assets.template)
  pdf.registerFontkit(fontkit)
  const regular = await pdf.embedFont(StandardFonts.TimesRoman)
  const font = buildUnicodeFallback(regular, await embedUnicodeFallbackFonts(pdf, assets.fallbackFonts))
  const pages = pdf.getPages()

  if (document.kind === 'warranty') {
    const { data } = document
    const paper = WARRANTY_PAPER
    for (const key of ['patientName', 'treatmentDate', 'certificateNo', 'issueDate'] as const) {
      const value = DATE_FIELDS.has(key) ? formatDocumentDate(data[key]) : data[key]
      drawSingle(pages[warrantySlots[key].page]!, font, value, warrantySlots[key], paper)
    }
    drawMulti(pages[0]!, font, data.treatmentPerformed, warrantySlots.treatmentPerformed, paper)
    pdf.setTitle(`Warranty Certificate - ${clean(data.patientName) || 'MB Dental Turkey'}`)
    pdf.setSubject(clean(data.certificateNo))
  } else {
    const { data } = document
    const page = pages[0]!
    for (const key of ['letterDate', 'patientName', 'passportNumber', 'nationality', 'arrivalDate', 'startDate', 'completionDate', 'phone', 'email', 'website'] as const) {
      const value = DATE_FIELDS.has(key) ? formatDocumentDate(data[key]) : data[key]
      drawSingle(page, font, value, invitationSlots[key], LETTER_PAPER)
    }
    drawMulti(page, font, data.treatmentPlan, invitationSlots.treatmentPlan, LETTER_PAPER, INVITATION_PLAN_RULE)
    pdf.setTitle(`Medical Invitation Letter - ${clean(data.patientName) || 'MB Dental Turkey'}`)
  }
  pdf.setAuthor('MB Dental Turkey')
  pdf.setCreator('MB Dental Turkey')
  pdf.setProducer('MB Dental Turkey')
  return pdf.save({ useObjectStreams: true })
}

const templateRequests = new Map<MbDocumentKind, Promise<ArrayBuffer>>()

function loadDocumentTemplate(kind: MbDocumentKind): Promise<ArrayBuffer> {
  let request = templateRequests.get(kind)
  if (!request) {
    request = fetch(`./templates/mb-dental/documents/${kind}.pdf`).then((response) => {
      if (!response.ok) throw new Error(`Could not load the ${kind} template: ${response.status}`)
      return response.arrayBuffer()
    }).catch((error) => { templateRequests.delete(kind); throw error })
    templateRequests.set(kind, request)
  }
  return request
}

export async function generateMbDocument(document: MbDocumentData): Promise<Uint8Array> {
  const [template, fallbackFonts] = await Promise.all([loadDocumentTemplate(document.kind), loadUnicodeFallbackFontBytes()])
  return renderMbDocument(document, { template, fallbackFonts })
}

export function mbDocumentFilename(document: MbDocumentData): string {
  const name = clean(document.data.patientName).replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'Patient'
  return document.kind === 'warranty' ? `MB-Warranty-Certificate-${name}.pdf` : `MB-Medical-Invitation-${name}.pdf`
}
