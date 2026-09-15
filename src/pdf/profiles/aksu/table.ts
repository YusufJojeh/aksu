import { box, type TreatmentRowBoxes } from '../shared/fieldBox'

/**
 * Builds one visit's rows from the artwork's own printed gridlines, so every row box IS the real
 * cell and `drawCenteredCell` can centre each value inside it (never touching a rule).
 *
 * `columnEdges` lists the vertical rules left to right, outer border included, so 6 edges give the
 * 5 printed columns. `rowEdges` lists the horizontal rules top to bottom, the header's bottom edge
 * first and the table's bottom border last, so 8 edges give the 7 printed rows.
 */
export const AKSU_GRIDLINE_INSET = 0.75

export interface AksuTableGrid {
  verticals: number[]
  horizontals: number[]
  left: number
  right: number
  top: number
  bottom: number
}

export interface AksuVisitTable {
  rows: TreatmentRowBoxes[]
  grid: AksuTableGrid
}

export function aksuVisitTable(
  columnEdges: readonly number[],
  rowEdges: readonly number[],
  fontSize = 13,
  minFontSize = 8,
): AksuVisitTable {
  const rows: TreatmentRowBoxes[] = []
  for (let index = 0; index + 1 < rowEdges.length; index += 1) {
    const top = rowEdges[index]!
    const bottom = rowEdges[index + 1]!
    const cell = (column: number) => {
      const left = columnEdges[column]!
      const right = columnEdges[column + 1]!
      return box(left + AKSU_GRIDLINE_INSET, bottom + AKSU_GRIDLINE_INSET, right - left - 2 * AKSU_GRIDLINE_INSET, top - bottom - 2 * AKSU_GRIDLINE_INSET, fontSize, 'center', undefined, minFontSize)
    }
    rows.push({ treatment: cell(0), quality: cell(1), quantity: cell(2), unitPrice: cell(3), total: cell(4) })
  }
  return {
    rows,
    grid: {
      verticals: columnEdges.slice(1, -1),
      horizontals: rowEdges.slice(1, -1),
      left: columnEdges[0]!,
      right: columnEdges[columnEdges.length - 1]!,
      top: rowEdges[0]!,
      bottom: rowEdges[rowEdges.length - 1]!,
    },
  }
}
