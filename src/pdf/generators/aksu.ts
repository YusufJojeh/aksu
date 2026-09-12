import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import i18n from '../../i18n'
import { clinicRegistry } from '../../clinics/registry'
import { finalTotalMinor, visitTotalMinor } from '../../domain/calculations'
import { draftReportSchema, type AksuReportData } from '../../domain/report'
import { formatLongDate, formatReportDate } from '../../lib/locale'
import { coordinatesForTemplate } from '../profiles/resolve'
import { loadArabicFont, loadTemplateBytes } from '../templateCache'
import type { GeneratedReport } from '../generateReport'
import { BLACK, WHITE, RED, clearBox, drawFitted, drawTableGrid, drawTreatmentRows, formatPdfMoney } from './shared'

const NAVY = rgb(0.07, 0.17, 0.32)
const GOLD = rgb(0.79, 0.61, 0.18)
const DARK = rgb(55 / 255, 51 / 255, 52 / 255)

export async function generateAksuReport(report: AksuReportData): Promise<GeneratedReport> {
  const validated = draftReportSchema.parse(report)
  if (validated.clinicId !== 'aksu') throw new Error('generateAksuReport received a non-Aksu report')

  const { bytes, resolved } = await loadTemplateBytes('aksu', validated.document.locale)
  if (resolved.clinicId !== 'aksu') throw new Error('Resolved a non-Aksu template for an Aksu report')
  const definition = resolved.definition
  const coordinates = coordinatesForTemplate('aksu', resolved.usedTemplate)

  const pdf = await PDFDocument.load(bytes)
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

  await drawTreatmentRows(pdf, page2, validated.firstVisit.treatmentRows, coordinates.page2.firstVisit.rows, regular, validated, { clearDynamicRegions: definition.clearDynamicRegions }, arabicFont)
  await drawFitted(pdf, page2, formatPdfMoney(visitTotalMinor(validated.firstVisit.treatmentRows), validated), coordinates.page2.firstVisit.total, bold, locale, BLACK, definition.clearDynamicRegions ? WHITE : undefined, arabicFont)
  if (definition.clearDynamicRegions) {
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
  await drawTreatmentRows(pdf, page2, validated.secondVisit.treatmentRows, coordinates.page2.secondVisit.rows, regular, validated, { clearDynamicRegions: definition.clearDynamicRegions }, arabicFont)
  await drawFitted(pdf, page2, formatPdfMoney(visitTotalMinor(validated.secondVisit.treatmentRows), validated), coordinates.page2.secondVisit.total, bold, locale, BLACK, definition.clearDynamicRegions ? WHITE : undefined, arabicFont)
  if (definition.redrawTableGrid) {
    drawTableGrid(page2, [191, 274, 358, 472], 529, 377, [509, 489, 469, 449, 427, 400, 377])
    drawTableGrid(page2, [183, 265, 335, 464], 264, 113, [243, 224, 203, 184, 163, 142, 113])
  }

  pdf.setTitle(`Treatment Plan - ${validated.patient.name}`)
  pdf.setAuthor(clinicRegistry.aksu.pdfAuthor)
  pdf.setCreator(clinicRegistry.aksu.pdfCreator)
  return { bytes: await pdf.save({ useObjectStreams: true }), clinicId: 'aksu', usedTemplate: resolved.usedTemplate, usedFallback: resolved.usedFallback }
}
