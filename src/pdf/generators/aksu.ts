import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import i18n from '../../i18n'
import { clinicRegistry } from '../../clinics/registry'
import { finalTotalMinor, secondVisitFinalTotalMinor, visitTotalMinor } from '../../domain/calculations'
import { draftReportSchema, type AksuReportData } from '../../domain/report'
import { formatLongDate, formatReportDate } from '../../lib/locale'
import type { AksuTemplateDefinition } from '../profiles/aksu'
import { coordinatesForTemplate } from '../profiles/resolve'
import type { FieldBox } from '../profiles/shared/fieldBox'
import { loadArabicFont, loadTemplateBytes } from '../templateCache'
import type { GeneratedReport } from '../generateReport'
import { buildUnicodeFallback, embedUnicodeFallbackFonts, loadUnicodeFallbackFontBytes, type UnicodeFallback } from '../unicodeFallback'
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
async function drawVisitTotal(pdf: PDFDocument, page: PDFPage, text: string, total: FieldBox, font: PDFFont, definition: AksuTemplateDefinition, arabicFont?: PDFFont, unicodeFallback?: UnicodeFallback): Promise<void> {
  if (definition.clearDynamicRegions) clearBox(page, total, WHITE)
  await drawCenteredCell(pdf, page, text, total, font, BLACK, arabicFont, VISIT_TOTAL_PADDING, unicodeFallback)
}

interface VisitDiscountDraw {
  discountEnabled: boolean
  discountExpiryDate?: string
}

async function drawVisitDiscount(pdf: PDFDocument, page: PDFPage, visit: VisitDiscountDraw, finalPrice: string, box: { sentence: FieldBox; price: FieldBox }, definition: AksuTemplateDefinition, t: ReturnType<typeof i18n.getFixedT>, locale: AksuReportData['document']['locale'], bold: PDFFont, arabicFont?: PDFFont, unicodeFallbackBold?: UnicodeFallback): Promise<void> {
  if (definition.clearDiscountRegion) {
    clearBox(page, box.sentence, GOLD)
    clearBox(page, box.price)
  }
  if (!visit.discountEnabled) return
  if (definition.drawDiscountSentence) {
    await drawFitted(pdf, page, t('document.discountExpires', { date: formatLongDate(visit.discountExpiryDate ?? '', locale) }), box.sentence, bold, locale, BLACK, undefined, arabicFont, unicodeFallbackBold)
  }
  await drawFitted(pdf, page, finalPrice, box.price, bold, locale, RED, undefined, arabicFont, unicodeFallbackBold)
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
  // Unicode fallback (Cyrillic, Polish/Turkish extended Latin, ...) for text a WinAnsi standard
  // font cannot encode — see unicodeFallback.ts. Built once per document and reused for every
  // dynamic text draw below (regular and bold share it; only the primary font differs per call).
  const fallbackEntries = await embedUnicodeFallbackFonts(pdf, await loadUnicodeFallbackFontBytes())
  const unicodeFallback = buildUnicodeFallback(regular, fallbackEntries)
  const unicodeFallbackBold = buildUnicodeFallback(bold, fallbackEntries)
  const [page1, page2] = pdf.getPages()
  if (!page1 || !page2) throw new Error('The treatment template must contain at least two pages')
  const locale = validated.document.locale
  const t = i18n.getFixedT(locale)

  // The supplied French artwork's own baked-in cover title has a typo ("Plan de taitement
  // dentaire" — missing the first "r" in "traitement"), confirmed by extracting the page's text
  // objects directly (pdfjs: "Plan de taitement" at 33pt, x=13.78 y=474.56, font g_d0_f1; "dentaire"
  // is a separate, already-correct second line at y=434.96 and is left untouched). It prints as a
  // real text object over the dark hero photo, not a raster image, so it can be patched the same
  // way the rest of this file overlays dynamic text: clear the exact glyph run's box with the
  // template's own measured background tone and redraw the corrected word in white.
  const page1Background = definition.clearDynamicRegions ? DARK : undefined
  if (resolved.usedTemplate === 'fr') {
    const titleLine1: FieldBox = { x: 13.7773, y: 474.5615, width: 320, height: 33, fontSize: 33, minFontSize: 33, alignment: 'left' }
    clearBox(page1, titleLine1, DARK)
    page1.drawText('Plan de traitement', { x: titleLine1.x, y: titleLine1.y, size: 33, font: bold, color: WHITE })
  }

  // The four page-1 field values (Date/Nom/Age/Téléphone in French; equivalent in Spanish) sit on a
  // printed white rule that runs wider than the field's own value box on BOTH sides — measured
  // directly from both templates' vector line objects vs. the profile's box.x/width, a real,
  // consistent gap in both fr.pdf and es.pdf, not measurement noise. Clearing only the value box
  // therefore leaves both slivers of the rule's white stroke uncovered, which render as stray white
  // dashes flanking the value once the field is redrawn over the dark photo background (the reported
  // "dash artifacts near Date/Nom/Age"). Clear each rule's full measured extent first — clamped to
  // never start left of the printed label's own measured right edge, since the rule's left end tucks
  // slightly *under* the label in both artworks (most visibly ES "Nombre:", label right edge 96.31 vs.
  // rule left edge 89.53) and clearing past that would eat into the label glyphs themselves — before
  // the per-field draw below clears its own (narrower) box again, which is harmless.
  if (page1Background && (resolved.usedTemplate === 'fr' || resolved.usedTemplate === 'es')) {
    // [ruleLeft, ruleRight, labelRight] per field, all measured from the template's own text/vector objects.
    const ruleSpans: [number, number, number][] = resolved.usedTemplate === 'fr'
      ? [[73.0, 344.7, 66.6], [73.0, 344.7, 72.2], [68.1, 344.7, 61.2], [113.5, 344.7, 114.9]]
      : [[80.3, 314.5, 80.7], [89.5, 314.5, 96.3], [76.1, 314.5, 72.4], [115.7, 314.5, 116.4]]
    const fields = [coordinates.page1.reportDate, coordinates.page1.patientName, coordinates.page1.age, coordinates.page1.phone]
    fields.forEach((field, index) => {
      const [ruleLeft, ruleRight, labelRight] = ruleSpans[index]!
      const clearLeft = Math.max(ruleLeft, labelRight)
      clearBox(page1, { ...field, x: clearLeft, width: ruleRight - clearLeft }, page1Background)
    })
  }

  const age = locale === 'ar' ? t('document.ageYears', { age: validated.patient.age }) : String(validated.patient.age)
  await drawFitted(pdf, page1, formatReportDate(validated.patient.reportDate, locale), coordinates.page1.reportDate, regular, locale, WHITE, page1Background, arabicFont, unicodeFallback)
  await drawFitted(pdf, page1, validated.patient.name, coordinates.page1.patientName, regular, locale, WHITE, page1Background, arabicFont, unicodeFallback)
  await drawFitted(pdf, page1, age, coordinates.page1.age, regular, locale, WHITE, page1Background, arabicFont, unicodeFallback)
  await drawFitted(pdf, page1, validated.patient.phone, coordinates.page1.phone, regular, locale, WHITE, page1Background, arabicFont, unicodeFallback)

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

  await drawTreatmentRows(pdf, page2, validated.firstVisit.treatmentRows, coordinates.page2.firstVisit.rows, regular, validated, { clearDynamicRegions: definition.clearDynamicRegions, centerInCells: true }, arabicFont, unicodeFallback)
  await drawVisitTotal(pdf, page2, formatPdfMoney(visitTotalMinor(validated.firstVisit.treatmentRows), validated), coordinates.page2.firstVisit.total, bold, definition, arabicFont, unicodeFallbackBold)
  await drawVisitDiscount(pdf, page2, validated.firstVisit, formatPdfMoney(finalTotalMinor(validated), validated), coordinates.page2.discount, definition, t, locale, bold, arabicFont, unicodeFallbackBold)
  if (definition.drawSecondVisitHeading) {
    await drawFitted(pdf, page2, t('document.secondVisitHeading', { interval: clinicRegistry.aksu.docOnly?.secondVisitInterval ?? '' }), coordinates.page2.secondVisit.heading, bold, locale, BLACK, WHITE, arabicFont, unicodeFallbackBold)
  }
  await drawTreatmentRows(pdf, page2, validated.secondVisit.treatmentRows, coordinates.page2.secondVisit.rows, regular, validated, { clearDynamicRegions: definition.clearDynamicRegions, centerInCells: true }, arabicFont, unicodeFallback)
  await drawVisitTotal(pdf, page2, formatPdfMoney(visitTotalMinor(validated.secondVisit.treatmentRows), validated), coordinates.page2.secondVisit.total, bold, definition, arabicFont, unicodeFallbackBold)
  await drawVisitDiscount(pdf, page2, validated.secondVisit, formatPdfMoney(secondVisitFinalTotalMinor(validated), validated), coordinates.page2.secondDiscount, definition, t, locale, bold, arabicFont, unicodeFallbackBold)
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
