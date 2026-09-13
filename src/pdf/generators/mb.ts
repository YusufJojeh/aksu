import fontkit from '@pdf-lib/fontkit'
import { LineCapStyle, PDFDocument, PDFPage, StandardFonts, rgb } from 'pdf-lib'
import { clinicRegistry } from '../../clinics/registry'
import { visitTotalMinor } from '../../domain/calculations'
import { draftReportSchema, mbConditionKeys, mbRecommendedTreatmentKeys, type MbReportData } from '../../domain/report'
import { formatReportDate } from '../../lib/locale'
import { coordinatesForTemplate } from '../profiles/resolve'
import { loadArabicFont, loadTemplateBytes } from '../templateCache'
import type { GeneratedReport } from '../generateReport'
import { BLACK, drawFitted, drawTreatmentRows, formatPdfMoney } from './shared'

const CHECK_GREEN = rgb(0.13, 0.59, 0.3)

// The MB oral-health coordinate data marks each row's divider line, not the checkbox square's
// visual center (confirmed by overlaying reference markers on the rendered template) — every
// mark needs this constant vertical correction to land inside the actual checkbox.
const CHECKBOX_Y_CORRECTION = 0

// Draws a bold check mark (not a filled dot) centered on a checkbox's coordinate point. The
// template's own checkbox border is a hairline stroke that can vanish on a low-resolution or
// recompressed view (e.g. a phone screenshot), which then reads as "the mark isn't in a box at
// all" even though it's correctly positioned — a soft fill behind the mark makes the checked
// state unambiguous regardless of whether that hairline border survives the viewing medium.
function drawCheckMark(page: PDFPage, x: number, y: number) {
  const cy = y + CHECKBOX_Y_CORRECTION
  const fillHalf = 6.5
  page.drawRectangle({ x: x - fillHalf, y: cy - fillHalf, width: fillHalf * 2, height: fillHalf * 2, color: CHECK_GREEN, opacity: 0.16 })
  const options = { thickness: 1.8, color: CHECK_GREEN, lineCap: LineCapStyle.Round }
  page.drawLine({ start: { x: x - 3.5, y: cy + 0.5 }, end: { x: x - 1.0, y: cy - 3.0 }, ...options })
  page.drawLine({ start: { x: x - 1.0, y: cy - 3.0 }, end: { x: x + 4.5, y: cy + 4.0 }, ...options })
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
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const [cover, oralHealth, treatmentPlan] = pdf.getPages()
  if (!cover || !oralHealth || !treatmentPlan) throw new Error('The MB Dental template must contain at least three pages')
  const locale = validated.document.locale

  await drawFitted(pdf, cover, validated.patient.name, coordinates.cover.patientName, regular, locale, BLACK, undefined, arabicFont)
  await drawFitted(pdf, cover, formatReportDate(validated.patient.reportDate, locale), coordinates.cover.reportDate, regular, locale, BLACK, undefined, arabicFont)
  await drawFitted(pdf, cover, String(validated.patient.age), coordinates.cover.age, regular, locale, BLACK, undefined, arabicFont)
  await drawFitted(pdf, cover, validated.patient.patientId, coordinates.cover.patientId, regular, locale, BLACK, undefined, arabicFont)
  await drawFitted(pdf, cover, validated.patient.phone, coordinates.cover.phone, regular, locale, BLACK, undefined, arabicFont)

  for (const key of mbConditionKeys) {
    if (!validated.oralHealth.currentCondition[key]) continue
    const point = coordinates.oralHealth.currentCondition[key]
    drawCheckMark(oralHealth, point.x, point.y)
  }
  for (const key of mbRecommendedTreatmentKeys) {
    if (!validated.oralHealth.recommendedTreatments[key]) continue
    const point = coordinates.oralHealth.recommendedTreatments[key]
    drawCheckMark(oralHealth, point.x, point.y)
  }

  // The MB template's table cells are blank in the source artwork — nothing to clear before drawing.
  await drawTreatmentRows(pdf, treatmentPlan, validated.firstVisit.treatmentRows, coordinates.treatmentPlan.firstVisit.rows, regular, validated, { clearDynamicRegions: false }, arabicFont)
  await drawFitted(pdf, treatmentPlan, formatPdfMoney(visitTotalMinor(validated.firstVisit.treatmentRows), validated), coordinates.treatmentPlan.firstVisit.total, bold, locale, BLACK, undefined, arabicFont)
  await drawTreatmentRows(pdf, treatmentPlan, validated.secondVisit.treatmentRows, coordinates.treatmentPlan.secondVisit.rows, regular, validated, { clearDynamicRegions: false }, arabicFont)
  await drawFitted(pdf, treatmentPlan, formatPdfMoney(visitTotalMinor(validated.secondVisit.treatmentRows), validated), coordinates.treatmentPlan.secondVisit.total, bold, locale, BLACK, undefined, arabicFont)

  pdf.setTitle(`Dental Report - ${validated.patient.name}`)
  pdf.setAuthor(clinicRegistry['mb-dental'].pdfAuthor)
  pdf.setCreator(clinicRegistry['mb-dental'].pdfCreator)
  return { bytes: await pdf.save({ useObjectStreams: true }), clinicId: 'mb-dental', usedTemplate: resolved.usedTemplate, usedFallback: resolved.usedFallback }
}
