import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import i18n from '../../i18n'
import { clinicRegistry } from '../../clinics/registry'
import { finalTotalMinor, visitTotalMinor } from '../../domain/calculations'
import { draftReportSchema, type AksuReportData } from '../../domain/report'
import { formatLongDate, formatReportDate } from '../../lib/locale'
import type { AksuTemplateDefinition } from '../profiles/aksu'
import { coordinatesForTemplate } from '../profiles/resolve'
import type { FieldBox } from '../profiles/shared/fieldBox'
import { loadArabicFont, loadTemplateBytes } from '../templateCache'
import type { GeneratedReport } from '../generateReport'
import { BLACK, WHITE, RED, VISIT_TOTAL_PADDING, clearBox, drawCenteredCell, drawFitted, drawTableGrid, drawTreatmentRows, formatPdfMoney } from './shared'

const NAVY = rgb(0.07, 0.17, 0.32)
const GOLD = rgb(0.79, 0.61, 0.18)
const DARK = rgb(55 / 255, 51 / 255, 52 / 255)
const AKSU_ARABIC_PAGE_SIZE: [number, number] = [594.75, 842.25]

async function createAksuArabicRasterDocument(): Promise<PDFDocument> {
  const pdf = await PDFDocument.create()
  for (let pageNumber = 1; pageNumber <= 5; pageNumber += 1) {
    const response = await fetch(`./templates/aksu/ar-pages/page-${pageNumber}.png`)
    if (!response.ok) throw new Error(`Unable to load Aksu Arabic preview artwork page ${pageNumber}`)
    const image = await pdf.embedPng(await response.arrayBuffer())
    const page = pdf.addPage(AKSU_ARABIC_PAGE_SIZE)
    page.drawImage(image, { x: 0, y: 0, width: AKSU_ARABIC_PAGE_SIZE[0], height: AKSU_ARABIC_PAGE_SIZE[1] })
  }
  return pdf
}

/**
 * A visit total is a standalone pill, not a dense table cell: it is centred on the font's real
 * ascender/descender metrics (spec §12) rather than on `(height - fontSize) / 2`, with the same
 * generous padding MB's gold pill uses.
 */
async function drawVisitTotal(pdf: PDFDocument, page: PDFPage, text: string, total: FieldBox, font: PDFFont, definition: AksuTemplateDefinition, arabicFont?: PDFFont): Promise<void> {
  if (definition.clearDynamicRegions) clearBox(page, total, WHITE)
  await drawCenteredCell(pdf, page, text, total, font, BLACK, arabicFont, VISIT_TOTAL_PADDING)
}

export async function generateAksuReport(report: AksuReportData): Promise<GeneratedReport> {
  const validated = draftReportSchema.parse(report)
  if (validated.clinicId !== 'aksu') throw new Error('generateAksuReport received a non-Aksu report')

  const { bytes, resolved } = await loadTemplateBytes('aksu', validated.document.locale)
  if (resolved.clinicId !== 'aksu') throw new Error('Resolved a non-Aksu template for an Aksu report')
  const definition = resolved.definition
  const coordinates = coordinatesForTemplate('aksu', resolved.usedTemplate)

  const pdf = resolved.usedTemplate === 'ar' ? await createAksuArabicRasterDocument() : await PDFDocument.load(bytes)
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

  const page1Background = definition.clearDynamicRegions ? DARK : undefined
  const age = locale === 'ar' ? t('document.ageYears', { age: validated.patient.age }) : String(validated.patient.age)
  await drawFitted(pdf, page1, formatReportDate(validated.patient.reportDate, locale), coordinates.page1.reportDate, regular, locale, WHITE, page1Background, arabicFont)
  await drawFitted(pdf, page1, validated.patient.name, coordinates.page1.patientName, regular, locale, WHITE, page1Background, arabicFont)
  await drawFitted(pdf, page1, age, coordinates.page1.age, regular, locale, WHITE, page1Background, arabicFont)
  await drawFitted(pdf, page1, validated.patient.phone, coordinates.page1.phone, regular, locale, WHITE, page1Background, arabicFont)

  for (const key of Object.keys(coordinates.page2.assessment) as Array<keyof typeof coordinates.page2.assessment>) {
    const point = coordinates.page2.assessment[key]
    if (definition.selectionStyle === 'gold') {
      if (validated.assessment[key]) page2.drawCircle({ x: point.x, y: point.y, size: 7.1, color: GOLD })
    } else {
      page2.drawRectangle({ x: point.x - 10, y: point.y - 10, width: 20, height: 20, color: WHITE })
      page2.drawCircle({ x: point.x, y: point.y, size: 7.5, borderColor: NAVY, borderWidth: 1.2, color: validated.assessment[key] ? NAVY : WHITE })
      if (validated.assessment[key]) page2.drawCircle({ x: point.x, y: point.y, size: 4.8, color: rgb(0.12, 0.31, 0.5) })
    }
  }

  await drawTreatmentRows(pdf, page2, validated.firstVisit.treatmentRows, coordinates.page2.firstVisit.rows, regular, validated, { clearDynamicRegions: definition.clearDynamicRegions, centerInCells: true }, arabicFont)
  await drawVisitTotal(pdf, page2, formatPdfMoney(visitTotalMinor(validated.firstVisit.treatmentRows), validated), coordinates.page2.firstVisit.total, bold, definition, arabicFont)
  if (definition.clearDiscountRegion) {
    clearBox(page2, coordinates.page2.discount.sentence, GOLD)
    clearBox(page2, coordinates.page2.discount.price)
  }
  if (validated.firstVisit.discountEnabled) {
    if (definition.drawDiscountSentence) {
      await drawFitted(pdf, page2, t('document.discountExpires', { date: formatLongDate(validated.firstVisit.discountExpiryDate ?? '', locale) }), coordinates.page2.discount.sentence, bold, locale, BLACK, undefined, arabicFont)
    }
    await drawFitted(pdf, page2, formatPdfMoney(finalTotalMinor(validated), validated), coordinates.page2.discount.price, bold, locale, RED, undefined, arabicFont)
  }
  if (definition.drawSecondVisitHeading) {
    await drawFitted(pdf, page2, t('document.secondVisitHeading', { interval: clinicRegistry.aksu.docOnly?.secondVisitInterval ?? '' }), coordinates.page2.secondVisit.heading, bold, locale, BLACK, WHITE, arabicFont)
  }
  await drawTreatmentRows(pdf, page2, validated.secondVisit.treatmentRows, coordinates.page2.secondVisit.rows, regular, validated, { clearDynamicRegions: definition.clearDynamicRegions, centerInCells: true }, arabicFont)
  await drawVisitTotal(pdf, page2, formatPdfMoney(visitTotalMinor(validated.secondVisit.treatmentRows), validated), coordinates.page2.secondVisit.total, bold, definition, arabicFont)
  // Clearing a pre-filled treatment column wipes the artwork's own rules with it, so any template
  // that carries its measured grid gets those exact rules put back.
  if (definition.clearDynamicRegions) {
    for (const grid of [coordinates.page2.firstVisit.grid, coordinates.page2.secondVisit.grid]) {
      if (grid) drawTableGrid(page2, grid)
    }
  }

  pdf.setTitle(`Treatment Plan - ${validated.patient.name}`)
  pdf.setAuthor(clinicRegistry.aksu.pdfAuthor)
  pdf.setCreator(clinicRegistry.aksu.pdfCreator)
  return { bytes: await pdf.save({ useObjectStreams: true }), clinicId: 'aksu', usedTemplate: resolved.usedTemplate, usedFallback: resolved.usedFallback }
}
