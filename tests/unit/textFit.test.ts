import { describe, expect, it } from 'vitest'
import { fitTextToBox } from '../../src/pdf/textFit'

const font = { widthOfTextAtSize: (text: string, size: number) => text.length * size * 0.5 }
const box = { x: 0, y: 0, width: 60, height: 20, fontSize: 12, minFontSize: 8, alignment: 'left' as const }

describe('fitTextToBox', () => {
  it('keeps a fitting preferred size', () => expect(fitTextToBox('Short', font, box).fontSize).toBe(12))
  it('shrinks and truncates long labels inside the cell', () => {
    const result = fitTextToBox('Un traitement exceptionnellement long', font, box)
    expect(result.fontSize).toBe(8); expect(result.width).toBeLessThanOrEqual(60); expect(result.text).toMatch(/…$/)
  })
})
