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

// Kept clear inside a table cell so values never touch its gridlines, yet small enough that
// ordinary values keep their preferred size.
const CELL_PADDING = { x: 3, y: 2 }

// Draws one value centered in a real table cell (box = the cell). Preferred size first; shrinks
// toward minFontSize only when the value exceeds the usable width (or, for shaped Arabic, height).
export async function drawCenteredCell(pdf: PDFDocument, page: PDFPage, text: string, cell: FieldBox, font: PDFFont, color = BLACK, searchFont?: PDFFont): Promise<void> {
  if (!text) return
  if (/[؀-ۿ]/.test(text)) {
    const direction = /[ء-ي]/.test(text) ? 'rtl' : 'ltr'
    await drawBrowserShapedText(pdf, page, text, { ...cell, alignment: 'center', direction }, color === WHITE ? '#ffffff' : '#171515', { centerInk: true, padding: CELL_PADDING })
    if (searchFont) page.drawText(text, { x: cell.x, y: cell.y, size: 1, font: searchFont, opacity: 0 })
    return
  }
  const usableWidth = cell.width - 2 * CELL_PADDING.x
  const usableHeight = cell.height - 2 * CELL_PADDING.y
  // heightAtSize(1) spans ascender to descender, so this cap keeps descenders inside the cell too.
  const lineHeight = font.heightAtSize(1)
  const ascentAt = (size: number) => font.heightAtSize(size, { descender: false })
  const oneLine = fitTextToBox(text, font, { ...cell, width: usableWidth, fontSize: Math.min(cell.fontSize, usableHeight / lineHeight) }, false)
  if (oneLine.width > usableWidth) {
    // Even the minimum size overflows one line: stack two centered lines rather than truncate.
    const lines = splitIntoTwoLines(text, font)
    if (lines) {
      const widest = (size: number) => Math.max(...lines.map((line) => font.widthOfTextAtSize(line, size)))
      // Block = top ascender to bottom descender = (1 + TWO_LINE_LEADING) line heights.
      let size = Math.min(cell.fontSize, usableHeight / ((1 + TWO_LINE_LEADING) * lineHeight))
      while (size > (cell.minFontSize ?? 6) && widest(size) > usableWidth) size -= 0.5
      if (widest(size) <= usableWidth) {
        const pitch = lineHeight * size * TWO_LINE_LEADING
        const descent = lineHeight * size - ascentAt(size)
        const bottomBaseline = cell.y + (cell.height - pitch - lineHeight * size) / 2 + descent
        lines.forEach((line, index) => {
          page.drawText(line, { x: cell.x + (cell.width - font.widthOfTextAtSize(line, size)) / 2, y: bottomBaseline + pitch * (lines.length - 1 - index), size, font, color })
        })
        return
      }
    }
  }
  const fitted = oneLine.width <= usableWidth ? oneLine : fitTextToBox(text, font, { ...cell, width: usableWidth, fontSize: oneLine.fontSize })
  // The standard Times/Helvetica ascender (683/718 per mille) matches their cap/digit height
  // (662-676/718), so centering the baseline-to-ascender band centers the visible glyphs. The
  // baseline is only nudged up if a descender (g, p, y) would otherwise enter the bottom padding.
  const ascent = ascentAt(fitted.fontSize)
  const descent = lineHeight * fitted.fontSize - ascent
  const baseline = Math.max(cell.y + (cell.height - ascent) / 2, cell.y + CELL_PADDING.y + descent)
  page.drawText(fitted.text, { x: cell.x + (cell.width - fitted.width) / 2, y: baseline, size: fitted.fontSize, font, color })
}

// Line pitch for a two-line cell, as a multiple of the font's ascender-to-descender height, so the
// first line's descenders never touch the second line's capitals.
const TWO_LINE_LEADING = 1.1

// Best two-line split at a space or just after a slash, minimising the wider line.
function splitIntoTwoLines(text: string, font: PDFFont): string[] | undefined {
  let best: string[] | undefined
  let bestWidth = Number.POSITIVE_INFINITY
  for (let index = 1; index < text.length; index += 1) {
    if (text[index] !== ' ' && text[index - 1] !== '/') continue
    const first = text.slice(0, index).trimEnd()
    const second = text.slice(index).trimStart()
    if (!first || !second) continue
    const width = Math.max(font.widthOfTextAtSize(first, 1), font.widthOfTextAtSize(second, 1))
    if (width < bestWidth) { bestWidth = width; best = [first, second] }
  }
  return best
}

export function formatPdfMoney(minor: number, report: ReportData): string {
  const value = formatDocumentMoneyMinor(minor, report.document.currency, report.document.locale, report.clinicId)
  return report.clinicId === 'aksu' ? value.replace(/^([^\d\s-]+)(?=\d)/u, '$1 ') : value
}

export function treatmentLabel(row: TreatmentRow, t: ReturnType<typeof i18n.getFixedT>): string {
  return row.customTreatment?.trim() || (row.treatmentKey ? t(`treatments.${row.treatmentKey}`) : '')
}

function isHotelRow(row: TreatmentRow): boolean {
  if (row.treatmentKey === 'hotelVipTransfer') return true
  return /hotel|hôtel|فندق/i.test(row.customTreatment ?? '')
}

export function rowHasContent(row: TreatmentRow | undefined): row is TreatmentRow {
  return Boolean(row?.enabled && (
    row.customTreatment?.trim() || row.quality.trim() || row.duration?.trim()
    || row.quantity > 0 || row.unitPrice > 0 || row.included
  ))
}

export async function drawTreatmentRows(pdf: PDFDocument, page: PDFPage, rows: TreatmentRow[], boxes: TreatmentRowBoxes[], font: PDFFont, report: ReportData, options: { clearDynamicRegions: boolean; centerInCells?: boolean }, searchFont?: PDFFont): Promise<void> {
  const locale = report.document.locale
  const t = i18n.getFixedT(locale)
  const drawCell = (text: string, cell: FieldBox) => options.centerInCells
    ? drawCenteredCell(pdf, page, text, cell, font, BLACK, searchFont)
    : drawFitted(pdf, page, text, cell, font, locale, BLACK, undefined, searchFont)
  for (let index = 0; index < boxes.length; index += 1) {
    const box = boxes[index]
    const row = rows[index]
    if (!box) continue
    if (options.clearDynamicRegions) for (const cell of Object.values(box)) clearBox(page, cell)
    if (!rowHasContent(row)) continue
    const included = t(report.clinicId === 'mb-dental'
      ? (isHotelRow(row) ? 'document.includedMbHotel' : 'document.includedMb')
      : 'document.included')
    await drawCell(treatmentLabel(row, t), box.treatment)
    await drawCell(row.quality, box.quality)
    await drawCell(row.duration || (row.quantity ? String(row.quantity) : ''), box.quantity)
    await drawCell(row.included ? included : row.unitPrice ? formatPdfMoney(Math.round(row.unitPrice * 100), report) : '', box.unitPrice)
    await drawCell(row.included ? included : row.unitPrice ? formatPdfMoney(rowTotalMinor(row), report) : '', box.total)
  }
}
