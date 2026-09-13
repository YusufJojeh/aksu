export type Direction = 'ltr' | 'rtl'
export type Alignment = 'left' | 'center' | 'right'

export interface FieldBox {
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  minFontSize?: number
  alignment: Alignment
  direction?: Direction
}

export interface TreatmentRowBoxes {
  treatment: FieldBox
  quality: FieldBox
  quantity: FieldBox
  unitPrice: FieldBox
  total: FieldBox
}

export const box = (
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize: number,
  alignment: Alignment = 'left',
  direction?: Direction,
  minFontSize = 6,
): FieldBox => ({ x, y, width, height, fontSize, minFontSize, alignment, direction })
