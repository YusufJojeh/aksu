import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import i18n from '../i18n'
import { finalTotalMinor, rowTotalMinor, visitTotalMinor } from '../domain/calculations'
import type { Locale, ReportData, TreatmentRow } from '../domain/report'
import { formatLongDate, formatReportDate } from '../lib/locale'
import { clinicConfig } from '../config/clinic.config'
import { pdfCoordinates, type FieldBox } from './coordinates'
import { fitTextToBox } from './textFit'
import { drawBrowserShapedText } from './arabicText'

const DARK = rgb(55 / 255, 51 / 255, 52 / 255)
const NAVY = rgb(0.07, 0.17, 0.32)
const GOLD = rgb(0.79, 0.61, 0.18)
const WHITE = rgb(1, 1, 1)
const BLACK = rgb(0.05, 0.04, 0.04)
const RED = rgb(0.88, 0.05, 0.05)
export const availableLocalizedTemplates: Locale[] = ['en']

export interface GeneratedReport { bytes: Uint8Array; usedTemplate: Locale; usedFallback: boolean }

function alignX(box: FieldBox, width: number): number {
  if (box.alignment === 'center') return box.x + (box.width - width) / 2
  if (box.alignment === 'right') return box.x + box.width - width
  return box.x
}

function clearBox(page: PDFPage, box: FieldBox, background = WHITE): void {
  page.drawRectangle({ x: box.x - 1, y: box.y - 1, width: box.width + 2, height: box.height + 2, color: background })
}

function drawTableGrid(page: PDFPage, verticals: number[], top: number, bottom: number, horizontals: number[]): void {
  const color = rgb(0.79, 0.79, 0.79)
  for (const x of verticals) page.drawLine({ start: { x, y: bottom }, end: { x, y: top }, color, thickness: 0.55 })
  for (const y of horizontals) page.drawLine({ start: { x: 40, y }, end: { x: 562, y }, color, thickness: 0.55 })
}

async function drawFitted(pdf: PDFDocument, page: PDFPage, text: string, box: FieldBox, font: PDFFont, locale: Locale, color = BLACK, background?: ReturnType<typeof rgb>): Promise<void> {
  if (background) clearBox(page, box, background)
  if (!text) return
  if (/[\u0600-\u06ff]/.test(text)) {
    const hasArabicLetters = /[\u0621-\u064A]/.test(text)
    await drawBrowserShapedText(pdf, page, text, { ...box, direction: hasArabicLetters ? 'rtl' : 'ltr', alignment: hasArabicLetters && box.alignment === 'left' ? 'right' : box.alignment }, color === RED ? '#e00d0d' : background === DARK ? '#ffffff' : '#171515')
    return
  }
  const fitted = fitTextToBox(text, font, box)
  page.drawText(fitted.text, { x: alignX(box, fitted.width), y: box.y + Math.max(1, (box.height - fitted.fontSize) / 2), size: fitted.fontSize, font, color })
}

const currencySymbols = { GBP: '£', EUR: '€', USD: '$', TRY: '₺' } as const
function formatPdfMoney(minor: number, report: ReportData): string {
  const amount = new Intl.NumberFormat('en-GB', { minimumFractionDigits: minor % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(minor / 100)
  return `${currencySymbols[report.document.currency]}${amount}`
}

function treatmentLabel(row: TreatmentRow, t: ReturnType<typeof i18n.getFixedT>): string {
  return row.customTreatment?.trim() || (row.treatmentKey ? t(`treatments.${row.treatmentKey}`) : '')
}

async function loadTemplate(locale: Locale): Promise<{ bytes: ArrayBuffer; usedTemplate: Locale; usedFallback: boolean }> {
  const supported = availableLocalizedTemplates.includes(locale)
  const usedTemplate = supported ? locale : 'en'
  const response = await fetch(`./templates/${usedTemplate}.pdf`)
  if (!response.ok) throw new Error(`Could not load PDF template: ${response.status}`)
  return { bytes: await response.arrayBuffer(), usedTemplate, usedFallback: !supported }
}

async function drawTreatmentRows(pdf: PDFDocument, page: PDFPage, rows: TreatmentRow[], boxes: typeof pdfCoordinates.page2.firstVisit.rows, font: PDFFont, report: ReportData): Promise<void> {
  const locale = report.document.locale
  const t = i18n.getFixedT(locale)
  for (let index = 0; index < boxes.length; index += 1) {
    const box = boxes[index]
    const row = rows[index]
    if (!box) continue
    for (const cell of Object.values(box)) clearBox(page, cell)
    if (!row?.enabled) continue
    const included = t('document.included')
    await drawFitted(pdf, page, treatmentLabel(row, t), box.treatment, font, locale)
    await drawFitted(pdf, page, row.quality, box.quality, font, locale)
    await drawFitted(pdf, page, row.duration || (row.quantity ? String(row.quantity) : ''), box.quantity, font, locale)
    await drawFitted(pdf, page, row.included ? included : row.unitPrice ? formatPdfMoney(Math.round(row.unitPrice * 100), report) : '', box.unitPrice, font, locale)
    await drawFitted(pdf, page, row.included ? included : row.unitPrice ? formatPdfMoney(rowTotalMinor(row), report) : '', box.total, font, locale)
  }
}

export async function generateReport(report: ReportData): Promise<GeneratedReport> {
  const template = await loadTemplate(report.document.locale)
  const pdf = await PDFDocument.load(template.bytes)
  pdf.registerFontkit(fontkit)
  // Embed the release-blocking Arabic typeface even though browser shaping is used for connected glyphs.
  const arabicFontResponse = await fetch('./fonts/NotoSansArabic-Regular.woff')
  if (arabicFontResponse.ok) await pdf.embedFont(await arabicFontResponse.arrayBuffer(), { subset: true })
  const regular = await pdf.embedFont(StandardFonts.TimesRoman)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const [page1, page2] = pdf.getPages()
  if (!page1 || !page2) throw new Error('The treatment template must contain at least two pages')
  const locale = report.document.locale
  const t = i18n.getFixedT(locale)

  await drawFitted(pdf, page1, formatReportDate(report.patient.reportDate, locale), pdfCoordinates.page1.reportDate, regular, locale, WHITE, DARK)
  await drawFitted(pdf, page1, report.patient.name, pdfCoordinates.page1.patientName, regular, locale, WHITE, DARK)
  await drawFitted(pdf, page1, String(report.patient.age), pdfCoordinates.page1.age, regular, locale, WHITE, DARK)
  await drawFitted(pdf, page1, report.patient.phone, pdfCoordinates.page1.phone, regular, locale, WHITE, DARK)

  for (const key of Object.keys(pdfCoordinates.page2.assessment) as Array<keyof typeof pdfCoordinates.page2.assessment>) {
    const point = pdfCoordinates.page2.assessment[key]
    page2.drawRectangle({ x: point.x - 10, y: point.y - 10, width: 20, height: 20, color: WHITE })
    page2.drawCircle({ x: point.x, y: point.y, size: 7.5, borderColor: NAVY, borderWidth: 1.2, color: report.assessment[key] ? NAVY : WHITE })
    if (report.assessment[key]) page2.drawCircle({ x: point.x, y: point.y, size: 4.8, color: rgb(0.12, 0.31, 0.5) })
  }

  await drawTreatmentRows(pdf, page2, report.firstVisit.treatmentRows, pdfCoordinates.page2.firstVisit.rows, regular, report)
  await drawFitted(pdf, page2, formatPdfMoney(visitTotalMinor(report.firstVisit.treatmentRows), report), pdfCoordinates.page2.firstVisit.total, bold, locale, BLACK, WHITE)
  clearBox(page2, pdfCoordinates.page2.discount.sentence, GOLD)
  clearBox(page2, pdfCoordinates.page2.discount.price)
  if (report.firstVisit.discountEnabled) {
    await drawFitted(pdf, page2, t('document.discountExpires', { date: formatLongDate(report.firstVisit.discountExpiryDate ?? '', locale) }), pdfCoordinates.page2.discount.sentence, bold, locale)
    await drawFitted(pdf, page2, formatPdfMoney(finalTotalMinor(report), report), pdfCoordinates.page2.discount.price, bold, locale, RED)
  }
  await drawFitted(pdf, page2, t('document.secondVisitHeading', { interval: clinicConfig.secondVisitInterval }), pdfCoordinates.page2.secondVisit.heading, bold, locale, BLACK, WHITE)
  await drawTreatmentRows(pdf, page2, report.secondVisit.treatmentRows, pdfCoordinates.page2.secondVisit.rows, regular, report)
  await drawFitted(pdf, page2, formatPdfMoney(visitTotalMinor(report.secondVisit.treatmentRows), report), pdfCoordinates.page2.secondVisit.total, bold, locale, BLACK, WHITE)
  drawTableGrid(page2, [191, 274, 358, 472], 529, 377, [509, 489, 469, 449, 427, 400, 377])
  drawTableGrid(page2, [183, 265, 335, 464], 264, 113, [243, 224, 203, 184, 163, 142, 113])

  pdf.setTitle(`Treatment Plan - ${report.patient.name}`)
  pdf.setAuthor(clinicConfig.doctorName)
  pdf.setCreator('Doctor Aksu Treatment Plan Generator')
  return { bytes: await pdf.save({ useObjectStreams: true }), usedTemplate: template.usedTemplate, usedFallback: template.usedFallback }
}
