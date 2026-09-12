import { rgb, type PDFDocument, type PDFFont, type PDFPage } from 'pdf-lib'
import i18n from '../../i18n'
import { rowTotalMinor } from '../../domain/calculations'
import type { Locale, ReportData, TreatmentRow } from '../../domain/report'
import { formatDocumentMoneyMinor } from '../../lib/locale'
import { drawBrowserShapedText } from '../arabicText'
import type { FieldBox, TreatmentRowBoxes } from '../profiles/shared/fieldBox'
import { fitTextToBox } from '../textFit'

export const WHITE = rgb(1, 1, 1)
export const BLACK = rgb(0.05, 0.04, 0.04)
export const RED = rgb(0.88, 0.05, 0.05)

export function alignX(box: FieldBox, width: number): number {
  if (box.alignment === 'center') return box.x + (box.width - width) / 2
  if (box.alignment === 'right') return box.x + box.width - width
  return box.x
}

export function clearBox(page: PDFPage, box: FieldBox, background = WHITE): void {
  page.drawRectangle({ x: box.x - 1, y: box.y - 1, width: box.width + 2, height: box.height + 2, color: background })
}

export function drawTableGrid(page: PDFPage, verticals: number[], top: number, bottom: number, horizontals: number[]): void {
  const color = rgb(0.79, 0.79, 0.79)
  for (const x of verticals) page.drawLine({ start: { x, y: bottom }, end: { x, y: top }, color, thickness: 0.55 })
  for (const y of horizontals) page.drawLine({ start: { x: 40, y }, end: { x: 562, y }, color, thickness: 0.55 })
}

export async function drawFitted(pdf: PDFDocument, page: PDFPage, text: string, box: FieldBox, font: PDFFont, locale: Locale, color = BLACK, background?: ReturnType<typeof rgb>, searchFont?: PDFFont): Promise<void> {
  if (background) clearBox(page, box, background)
  if (!text) return
  if (/[؀-ۿ]/.test(text)) {
    const hasArabicLetters = /[ء-ي]/.test(text)
    await drawBrowserShapedText(pdf, page, text, { ...box, direction: hasArabicLetters ? 'rtl' : 'ltr', alignment: hasArabicLetters && box.alignment === 'left' ? 'right' : box.alignment }, color === RED ? '#e00d0d' : color === WHITE ? '#ffffff' : '#171515')
    if (searchFont) page.drawText(text, { x: box.x, y: box.y, size: 1, font: searchFont, opacity: 0 })
    return
  }
  const fitted = fitTextToBox(text, font, box)
  page.drawText(fitted.text, { x: alignX(box, fitted.width), y: box.y + Math.max(1, (box.height - fitted.fontSize) / 2), size: fitted.fontSize, font, color })
}

export function formatPdfMoney(minor: number, report: ReportData): string {
  return formatDocumentMoneyMinor(minor, report.document.currency, report.document.locale)
}

export function treatmentLabel(row: TreatmentRow, t: ReturnType<typeof i18n.getFixedT>): string {
  return row.customTreatment?.trim() || (row.treatmentKey ? t(`treatments.${row.treatmentKey}`) : '')
}

export function rowHasContent(row: TreatmentRow | undefined): row is TreatmentRow {
  return Boolean(row?.enabled && (
    row.customTreatment?.trim() || row.quality.trim() || row.duration?.trim()
    || row.quantity > 0 || row.unitPrice > 0 || row.included
  ))
}

export async function drawTreatmentRows(pdf: PDFDocument, page: PDFPage, rows: TreatmentRow[], boxes: TreatmentRowBoxes[], font: PDFFont, report: ReportData, options: { clearDynamicRegions: boolean }, searchFont?: PDFFont): Promise<void> {
  const locale = report.document.locale
  const t = i18n.getFixedT(locale)
  for (let index = 0; index < boxes.length; index += 1) {
    const box = boxes[index]
    const row = rows[index]
    if (!box) continue
    if (options.clearDynamicRegions) for (const cell of Object.values(box)) clearBox(page, cell)
    if (!rowHasContent(row)) continue
    const included = t('document.included')
    await drawFitted(pdf, page, treatmentLabel(row, t), box.treatment, font, locale, BLACK, undefined, searchFont)
    await drawFitted(pdf, page, row.quality, box.quality, font, locale, BLACK, undefined, searchFont)
    await drawFitted(pdf, page, row.duration || (row.quantity ? String(row.quantity) : ''), box.quantity, font, locale, BLACK, undefined, searchFont)
    await drawFitted(pdf, page, row.included ? included : row.unitPrice ? formatPdfMoney(Math.round(row.unitPrice * 100), report) : '', box.unitPrice, font, locale, BLACK, undefined, searchFont)
    await drawFitted(pdf, page, row.included ? included : row.unitPrice ? formatPdfMoney(rowTotalMinor(row), report) : '', box.total, font, locale, BLACK, undefined, searchFont)
  }
}
