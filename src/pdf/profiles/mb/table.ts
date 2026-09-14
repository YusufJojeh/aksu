import { box, type Direction, type TreatmentRowBoxes } from '../shared/fieldBox'

// MB treatment-table values are centered inside their real cells, so every row box built here IS
// the cell: bounded by the template's own gridlines (measured at 4x render scale, gridline center
// to gridline center), inset just enough to stay off the stroke. The renderer then centers text on
// box.x + width / 2 and box.y + height / 2 with its own padding — nothing here positions a baseline.
export type MbTableColumn = keyof TreatmentRowBoxes

export interface MbCellSize { fontSize: number; minFontSize: number }

const GRIDLINE_INSET = 0.75

// Real filled MB references print every Latin table value in ~15.8pt Times (SERGIO ALMEIDO.pdf,
// derived from measured glyph widths). The preferred size sits above that for legibility; the
// renderer only shrinks a value toward the minimum when it would exceed its cell's usable width.
export const mbLatinCellSizes: Record<MbTableColumn, MbCellSize> = {
  treatment: { fontSize: 18, minFontSize: 11 },
  quality: { fontSize: 18, minFontSize: 11 },
  quantity: { fontSize: 18, minFontSize: 11 },
  unitPrice: { fontSize: 18, minFontSize: 11 },
  total: { fontSize: 18, minFontSize: 11 },
}

// The English template's columns are wider than the French ones (material 97.8pt vs 78.8pt,
// unit price 97.5pt vs 75.2pt), so English values can print larger before shrink-to-fit kicks in.
// 20pt keeps descenders (g, p, y) clear of the bottom gridline in the 27pt rows; the narrow 51pt
// Qty column falls back to two centered lines instead of truncating.
export const mbEnglishCellSizes: Record<MbTableColumn, MbCellSize> = {
  treatment: { fontSize: 20, minFontSize: 11 },
  quality: { fontSize: 20, minFontSize: 11 },
  quantity: { fontSize: 20, minFontSize: 11 },
  unitPrice: { fontSize: 20, minFontSize: 11 },
  total: { fontSize: 20, minFontSize: 11 },
}

// Arabic cells mix browser-shaped Arabic (Noto Sans Arabic) with plain Latin digits drawn in
// Helvetica. Shaped Arabic with hamza/lam-alef ascenders and descenders is limited by ink height
// in the 27pt rows (~19pt max), while digit-only prices and totals have room to stay more prominent.
export const mbArabicCellSizes: Record<MbTableColumn, MbCellSize> = {
  treatment: { fontSize: 19, minFontSize: 11 },
  quality: { fontSize: 19, minFontSize: 11 },
  quantity: { fontSize: 19, minFontSize: 11 },
  unitPrice: { fontSize: 20, minFontSize: 12 },
  total: { fontSize: 20, minFontSize: 12 },
}

// `rowEdges` lists the horizontal gridlines top to bottom (header bottom edge first, table bottom
// border last), so N+1 edges produce N rows; `columns` gives each column's [left, right] gridlines.
export function mbTableRows(
  columns: Record<MbTableColumn, readonly [number, number]>,
  rowEdges: readonly number[],
  sizes: Record<MbTableColumn, MbCellSize>,
  direction?: Direction,
): TreatmentRowBoxes[] {
  const rows: TreatmentRowBoxes[] = []
  for (let index = 0; index + 1 < rowEdges.length; index += 1) {
    const top = rowEdges[index]!
    const bottom = rowEdges[index + 1]!
    const cell = (column: MbTableColumn) => {
      const [left, right] = columns[column]
      const { fontSize, minFontSize } = sizes[column]
      return box(left + GRIDLINE_INSET, bottom + GRIDLINE_INSET, right - left - 2 * GRIDLINE_INSET, top - bottom - 2 * GRIDLINE_INSET, fontSize, 'center', direction, minFontSize)
    }
    rows.push({ treatment: cell('treatment'), quality: cell('quality'), quantity: cell('quantity'), unitPrice: cell('unitPrice'), total: cell('total') })
  }
  return rows
}
