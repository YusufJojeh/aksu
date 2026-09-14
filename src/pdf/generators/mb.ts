import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, PDFPage, StandardFonts, rgb, type PDFFont } from 'pdf-lib'
import { clinicRegistry } from '../../clinics/registry'
import { visitTotalMinor } from '../../domain/calculations'
import { draftReportSchema, mbConditionKeys, mbRecommendedTreatmentKeys, type MbReportData } from '../../domain/report'
import { formatReportDate } from '../../lib/locale'
import { coordinatesForTemplate } from '../profiles/resolve'
import { loadArabicFont, loadTemplateBytes } from '../templateCache'
import type { GeneratedReport } from '../generateReport'
import { fitTextToBox } from '../textFit'
import type { FieldBox } from '../profiles/shared/fieldBox'
import { alignX, BLACK, drawCenteredCell, drawFitted, drawTreatmentRows, formatPdfMoney, rowHasContent, VISIT_TOTAL_PADDING, WHITE } from './shared'

const CHECK_RED = rgb(0.82, 0.11, 0.11)
const CHECK_GREEN = rgb(0.13, 0.59, 0.3)

// The MB oral-health coordinate data sits slightly below the visual center of each checkbox.
// This correction places the check mark in the middle of the printed square.
const CHECKBOX_Y_CORRECTION = 7

// Real filled MB reports consistently mark current-condition boxes red and recommended-treatment
// boxes green. Draw a centered tick instead of a filled square so the original checkbox remains
// visible in the generated PDF.
function drawCheckMark(page: PDFPage, x: number, y: number, color: typeof CHECK_GREEN) {
  const cy = y + CHECKBOX_Y_CORRECTION
  page.drawLine({ start: { x: x - 5.8, y: cy - 0.4 }, end: { x: x - 1.9, y: cy - 4.1 }, color, thickness: 2.2 })
  page.drawLine({ start: { x: x - 1.9, y: cy - 4.1 }, end: { x: x + 6.1, y: cy + 4.6 }, color, thickness: 2.2 })
}

function drawFrenchPatientName(page: PDFPage, text: string, box: FieldBox, font: PDFFont): boolean {
  const words = text.trim().split(/\s+/)
  if (words.length < 2) return false
  let split = 1
  let bestWidth = Number.POSITIVE_INFINITY
  for (let index = 1; index < words.length; index += 1) {
    const first = words.slice(0, index).join(' ')
    const second = words.slice(index).join(' ')
    const width = Math.max(font.widthOfTextAtSize(first, box.fontSize), font.widthOfTextAtSize(second, box.fontSize))
    if (width < bestWidth) { bestWidth = width; split = index }
  }
  const lines = [words.slice(0, split).join(' '), words.slice(split).join(' ')]
  const baselines = [box.y + 23, box.y + 4]
  for (let index = 0; index < lines.length; index += 1) {
    const fitted = fitTextToBox(lines[index]!, font, { ...box, height: box.fontSize })
    page.drawText(fitted.text, { x: alignX(box, fitted.width), y: baselines[index], size: fitted.fontSize, font, color: BLACK })
  }
  return true
}

function formatMbCoverDate(value: string, locale: MbReportData['document']['locale']): string {
  const formatted = formatReportDate(value, locale)
  return locale === 'fr' ? formatted.replaceAll('/', '- ') : formatted
}

function formatMbAge(age: number, locale: MbReportData['document']['locale']): string {
  if (locale === 'fr') return `${age} ANS`
  if (locale === 'ar') return `${age} سنة`
  return String(age)
}

export async function generateMbReport(report: MbReportData): Promise<GeneratedReport> {
  const validated = draftReportSchema.parse(report)
  if (validated.clinicId !== 'mb-dental') throw new Error('generateMbReport received a non-MB report')

  const { bytes, resolved } = await loadTemplateBytes('mb-dental', validated.document.locale)
  if (resolved.clinicId !== 'mb-dental') throw new Error('Resolved a non-MB template for an MB report')
  const coordinates = coordinatesForTemplate('mb-dental', resolved.usedTemplate)

  const pdf = await PDFDocument.load(bytes)
  pdf.registerFontkit(fontkit)
  const arabicFontBytes = await loadArabicFont()
  const arabicFont = arabicFontBytes ? await pdf.embedFont(arabicFontBytes, { subset: true }) : undefined
  const regular = await pdf.embedFont(StandardFonts.TimesRoman)
  const [cover, oralHealth, treatmentPlan] = pdf.getPages()
  if (!cover || !oralHealth || !treatmentPlan) throw new Error('The MB Dental template must contain at least three pages')
  const locale = validated.document.locale
  // Real filled Arabic MB reports print Latin digits/prices in a sans face, both in the table and the totals.
  const numberFont = locale === 'ar' ? await pdf.embedFont(StandardFonts.Helvetica) : regular

  if (locale !== 'fr' || !drawFrenchPatientName(cover, validated.patient.name, coordinates.cover.patientName, regular)) {
    await drawFitted(pdf, cover, validated.patient.name, coordinates.cover.patientName, regular, locale, BLACK, undefined, arabicFont)
  }
  await drawFitted(pdf, cover, formatMbCoverDate(validated.patient.reportDate, locale), coordinates.cover.reportDate, regular, locale, BLACK, undefined, arabicFont)
  await drawFitted(pdf, cover, formatMbAge(validated.patient.age, locale), coordinates.cover.age, regular, locale, BLACK, undefined, arabicFont)
  await drawFitted(pdf, cover, validated.patient.patientId, coordinates.cover.patientId, regular, locale, BLACK, undefined, arabicFont)
  await drawFitted(pdf, cover, validated.patient.phone, coordinates.cover.phone, regular, locale, BLACK, undefined, arabicFont)

  for (const key of mbConditionKeys) {
    if (!validated.oralHealth.currentCondition[key]) continue
    const point = coordinates.oralHealth.currentCondition[key]
    drawCheckMark(oralHealth, point.x, point.y, CHECK_RED)
  }
  for (const key of mbRecommendedTreatmentKeys) {
    if (!validated.oralHealth.recommendedTreatments[key]) continue
    const point = coordinates.oralHealth.recommendedTreatments[key]
    drawCheckMark(oralHealth, point.x, point.y, CHECK_GREEN)
  }

  // The MB template's table cells are blank in the source artwork — nothing to clear before drawing.
  // Row boxes are the real cells (profiles/mb/table.ts), so every value is centered inside its cell.
  const tableOptions = { clearDynamicRegions: false, centerInCells: true }
  await drawTreatmentRows(pdf, treatmentPlan, validated.firstVisit.treatmentRows, coordinates.treatmentPlan.firstVisit.rows, numberFont, validated, tableOptions, arabicFont)
  if (validated.firstVisit.treatmentRows.some(rowHasContent)) {
    await drawCenteredCell(pdf, treatmentPlan, formatPdfMoney(visitTotalMinor(validated.firstVisit.treatmentRows), validated), coordinates.treatmentPlan.firstVisit.total, numberFont, WHITE, arabicFont, VISIT_TOTAL_PADDING)
  }
  await drawTreatmentRows(pdf, treatmentPlan, validated.secondVisit.treatmentRows, coordinates.treatmentPlan.secondVisit.rows, numberFont, validated, tableOptions, arabicFont)
  if (validated.secondVisit.treatmentRows.some(rowHasContent)) {
    await drawCenteredCell(pdf, treatmentPlan, formatPdfMoney(visitTotalMinor(validated.secondVisit.treatmentRows), validated), coordinates.treatmentPlan.secondVisit.total, numberFont, WHITE, arabicFont, VISIT_TOTAL_PADDING)
  }

  pdf.setTitle(`Dental Report - ${validated.patient.name}`)
  pdf.setAuthor(clinicRegistry['mb-dental'].pdfAuthor)
  pdf.setCreator(clinicRegistry['mb-dental'].pdfCreator)
  return { bytes: await pdf.save({ useObjectStreams: true }), clinicId: 'mb-dental', usedTemplate: resolved.usedTemplate, usedFallback: resolved.usedFallback }
}
