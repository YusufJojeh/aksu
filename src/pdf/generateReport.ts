import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import i18n from '../i18n'
import { finalTotalMinor, rowTotalMinor, visitTotalMinor } from '../domain/calculations'
import { draftReportSchema, type Locale, type ReportData, type TreatmentRow } from '../domain/report'
import { formatDocumentMoneyMinor, formatLongDate, formatReportDate } from '../lib/locale'
import { clinicConfig } from '../config/clinic.config'
import { coordinatesForTemplate, type FieldBox, type TreatmentRowBoxes } from './coordinates'
import { fitTextToBox } from './textFit'
import { drawBrowserShapedText } from './arabicText'
import { resolveTemplate, type PdfTemplateDefinition } from './templates'

const DARK = rgb(55 / 255, 51 / 255, 52 / 255)
const NAVY = rgb(0.07, 0.17, 0.32)
const GOLD = rgb(0.79, 0.61, 0.18)
const WHITE = rgb(1, 1, 1)
const BLACK = rgb(0.05, 0.04, 0.04)
const RED = rgb(0.88, 0.05, 0.05)
export { availableLocalizedTemplates } from './templates'

export interface GeneratedReport { bytes: Uint8Array; usedTemplate: Locale; usedFallback: boolean }

const templateRequests = new Map<Locale, Promise<ArrayBuffer>>()
let arabicFontRequest: Promise<ArrayBuffer | undefined> | undefined

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

async function drawFitted(pdf: PDFDocument, page: PDFPage, text: string, box: FieldBox, font: PDFFont, locale: Locale, color = BLACK, background?: ReturnType<typeof rgb>, searchFont?: PDFFont): Promise<void> {
  if (background) clearBox(page, box, background)
  if (!text) return
  if (/[\u0600-\u06ff]/.test(text)) {
    const hasArabicLetters = /[\u0621-\u064A]/.test(text)
    await drawBrowserShapedText(pdf, page, text, { ...box, direction: hasArabicLetters ? 'rtl' : 'ltr', alignment: hasArabicLetters && box.alignment === 'left' ? 'right' : box.alignment }, color === RED ? '#e00d0d' : color === WHITE ? '#ffffff' : '#171515')
    if (searchFont) page.drawText(text, { x: box.x, y: box.y, size: 1, font: searchFont, opacity: 0 })
    return
  }
  const fitted = fitTextToBox(text, font, box)
  page.drawText(fitted.text, { x: alignX(box, fitted.width), y: box.y + Math.max(1, (box.height - fitted.fontSize) / 2), size: fitted.fontSize, font, color })
}

function formatPdfMoney(minor: number, report: ReportData): string {
  return formatDocumentMoneyMinor(minor, report.document.currency, report.document.locale)
}

function treatmentLabel(row: TreatmentRow, t: ReturnType<typeof i18n.getFixedT>): string {
  return row.customTreatment?.trim() || (row.treatmentKey ? t(`treatments.${row.treatmentKey}`) : '')
}

function rowHasContent(row: TreatmentRow | undefined): row is TreatmentRow {
  return Boolean(row?.enabled && (
    row.customTreatment?.trim() || row.quality.trim() || row.duration?.trim()
    || row.quantity > 0 || row.unitPrice > 0 || row.included
  ))
}

async function loadTemplate(locale: Locale): Promise<{ bytes: ArrayBuffer; definition: PdfTemplateDefinition; usedTemplate: Locale; usedFallback: boolean }> {
  const { definition, usedFallback } = resolveTemplate(locale)
  const usedTemplate = definition.locale
  let request = templateRequests.get(usedTemplate)
  if (!request) {
    request = fetch(`./templates/${usedTemplate}.pdf`).then((response) => {
      if (!response.ok) throw new Error(`Could not load PDF template: ${response.status}`)
      return response.arrayBuffer()
    }).catch((error) => {
      templateRequests.delete(usedTemplate)
      throw error
    })
    templateRequests.set(usedTemplate, request)
  }
  return { bytes: await request, definition, usedTemplate, usedFallback }
}

async function loadArabicFont(): Promise<ArrayBuffer | undefined> {
  arabicFontRequest ??= fetch('./fonts/NotoSansArabic-Regular.woff')
    .then((response) => response.ok ? response.arrayBuffer() : undefined)
    .catch((error) => {
      arabicFontRequest = undefined
      throw error
    })
  return arabicFontRequest
}

async function drawTreatmentRows(pdf: PDFDocument, page: PDFPage, rows: TreatmentRow[], boxes: TreatmentRowBoxes[], font: PDFFont, report: ReportData, template: PdfTemplateDefinition, searchFont?: PDFFont): Promise<void> {
  const locale = report.document.locale
  const t = i18n.getFixedT(locale)
  for (let index = 0; index < boxes.length; index += 1) {
    const box = boxes[index]
    const row = rows[index]
    if (!box) continue
    if (template.clearDynamicRegions) for (const cell of Object.values(box)) clearBox(page, cell)
    if (!rowHasContent(row)) continue
    const included = t('document.included')
    await drawFitted(pdf, page, treatmentLabel(row, t), box.treatment, font, locale, BLACK, undefined, searchFont)
    await drawFitted(pdf, page, row.quality, box.quality, font, locale, BLACK, undefined, searchFont)
    await drawFitted(pdf, page, row.duration || (row.quantity ? String(row.quantity) : ''), box.quantity, font, locale, BLACK, undefined, searchFont)
    await drawFitted(pdf, page, row.included ? included : row.unitPrice ? formatPdfMoney(Math.round(row.unitPrice * 100), report) : '', box.unitPrice, font, locale, BLACK, undefined, searchFont)
    await drawFitted(pdf, page, row.included ? included : row.unitPrice ? formatPdfMoney(rowTotalMinor(row), report) : '', box.total, font, locale, BLACK, undefined, searchFont)
  }
}

export async function generateReport(report: ReportData): Promise<GeneratedReport> {
  const validated = draftReportSchema.parse(report)
  const template = await loadTemplate(validated.document.locale)
  const coordinates = coordinatesForTemplate(template.usedTemplate)
  const pdf = await PDFDocument.load(template.bytes)
  pdf.registerFontkit(fontkit)
  // Embed the release-blocking Arabic typeface even though browser shaping is used for connected glyphs.
  const arabicFontBytes = await loadArabicFont()
  const arabicFont = arabicFontBytes ? await pdf.embedFont(arabicFontBytes, { subset: true }) : undefined
  const regular = await pdf.embedFont(StandardFonts.TimesRoman)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const [page1, page2] = pdf.getPages()
  if (!page1 || !page2) throw new Error('The treatment template must contain at least two pages')
  const locale = validated.document.locale
  const t = i18n.getFixedT(locale)

  const page1Background = template.definition.clearDynamicRegions ? DARK : undefined
  const age = locale === 'ar' ? t('document.ageYears', { age: validated.patient.age }) : String(validated.patient.age)
  await drawFitted(pdf, page1, formatReportDate(validated.patient.reportDate, locale), coordinates.page1.reportDate, regular, locale, WHITE, page1Background, arabicFont)
  await drawFitted(pdf, page1, validated.patient.name, coordinates.page1.patientName, regular, locale, WHITE, page1Background, arabicFont)
  await drawFitted(pdf, page1, age, coordinates.page1.age, regular, locale, WHITE, page1Background, arabicFont)
  await drawFitted(pdf, page1, validated.patient.phone, coordinates.page1.phone, regular, locale, WHITE, page1Background, arabicFont)

  for (const key of Object.keys(coordinates.page2.assessment) as Array<keyof typeof coordinates.page2.assessment>) {
    const point = coordinates.page2.assessment[key]
    if (template.definition.selectionStyle === 'gold') {
      if (validated.assessment[key]) page2.drawCircle({ x: point.x, y: point.y, size: 7.1, color: GOLD })
    } else {
      page2.drawRectangle({ x: point.x - 10, y: point.y - 10, width: 20, height: 20, color: WHITE })
      page2.drawCircle({ x: point.x, y: point.y, size: 7.5, borderColor: NAVY, borderWidth: 1.2, color: validated.assessment[key] ? NAVY : WHITE })
      if (validated.assessment[key]) page2.drawCircle({ x: point.x, y: point.y, size: 4.8, color: rgb(0.12, 0.31, 0.5) })
    }
  }

  await drawTreatmentRows(pdf, page2, validated.firstVisit.treatmentRows, coordinates.page2.firstVisit.rows, regular, validated, template.definition, arabicFont)
  await drawFitted(pdf, page2, formatPdfMoney(visitTotalMinor(validated.firstVisit.treatmentRows), validated), coordinates.page2.firstVisit.total, bold, locale, BLACK, template.definition.clearDynamicRegions ? WHITE : undefined, arabicFont)
  if (template.definition.clearDynamicRegions) {
    clearBox(page2, coordinates.page2.discount.sentence, GOLD)
    clearBox(page2, coordinates.page2.discount.price)
  }
  if (validated.firstVisit.discountEnabled) {
    if (template.definition.drawDiscountSentence) {
      await drawFitted(pdf, page2, t('document.discountExpires', { date: formatLongDate(validated.firstVisit.discountExpiryDate ?? '', locale) }), coordinates.page2.discount.sentence, bold, locale, BLACK, undefined, arabicFont)
    }
    await drawFitted(pdf, page2, formatPdfMoney(finalTotalMinor(validated), validated), coordinates.page2.discount.price, bold, locale, RED, undefined, arabicFont)
  }
  if (template.definition.drawSecondVisitHeading) {
    await drawFitted(pdf, page2, t('document.secondVisitHeading', { interval: clinicConfig.secondVisitInterval }), coordinates.page2.secondVisit.heading, bold, locale, BLACK, WHITE, arabicFont)
  }
  await drawTreatmentRows(pdf, page2, validated.secondVisit.treatmentRows, coordinates.page2.secondVisit.rows, regular, validated, template.definition, arabicFont)
  await drawFitted(pdf, page2, formatPdfMoney(visitTotalMinor(validated.secondVisit.treatmentRows), validated), coordinates.page2.secondVisit.total, bold, locale, BLACK, template.definition.clearDynamicRegions ? WHITE : undefined, arabicFont)
  if (template.definition.redrawTableGrid) {
    drawTableGrid(page2, [191, 274, 358, 472], 529, 377, [509, 489, 469, 449, 427, 400, 377])
    drawTableGrid(page2, [183, 265, 335, 464], 264, 113, [243, 224, 203, 184, 163, 142, 113])
  }

  pdf.setTitle(`Treatment Plan - ${validated.patient.name}`)
  pdf.setAuthor(clinicConfig.doctorName)
  pdf.setCreator('Doctor Aksu Treatment Plan Generator')
  return { bytes: await pdf.save({ useObjectStreams: true }), usedTemplate: template.usedTemplate, usedFallback: template.usedFallback }
}
