import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { describe, expect, it } from 'vitest'
import { buildUnicodeFallback, embedUnicodeFallbackFonts } from '../../src/pdf/unicodeFallback'
import { cannotEncode } from '../../src/pdf/generators/shared'

// These are the exact strings the QA pass found crashing PDF generation for the Dr. Emir Aksu
// clinic: a WinAnsi (cp1252) standard font throws synchronously from `widthOfTextAtSize`/
// `drawText` for any of these characters, which is what used to blow up report generation.
const REGRESSION_STRINGS = [
  'Лечение',
  'Пациент',
  'ą ć ę ł ń ó ś ź ż',
  'İ ı Ş ş Ğ ğ',
  'ä ö ü ß',
  'é è ç',
]

function loadFallbackFontBytes(): Uint8Array[] {
  const dir = path.resolve(__dirname, '../../public/fonts')
  return ['GeistLatin.woff2', 'GeistLatinExt.woff2', 'GeistCyrillic.woff2'].map((name) => new Uint8Array(readFileSync(path.join(dir, name))))
}

describe('unicode fallback font embedding', () => {
  it('confirms the standard WinAnsi font is the actual crash source (sanity check on the bug report)', async () => {
    const pdf = await PDFDocument.create()
    const times = await pdf.embedFont(StandardFonts.TimesRoman)
    expect(() => times.widthOfTextAtSize('Лечение', 12)).toThrow()
    expect(() => times.widthOfTextAtSize('ą ć ę ł ń ó ś ź ż', 12)).toThrow()
  })

  it.each(REGRESSION_STRINGS)('draws %s to a PDF without throwing, using the fallback chain', async (text) => {
    const pdf = await PDFDocument.create()
    pdf.registerFontkit(fontkit)
    const regular = await pdf.embedFont(StandardFonts.TimesRoman)
    const entries = await embedUnicodeFallbackFonts(pdf, loadFallbackFontBytes())
    const fallback = buildUnicodeFallback(regular, entries)
    const page = pdf.addPage()

    expect(() => {
      const measurer = cannotEncode(regular, text) ? fallback : regular
      const width = measurer.widthOfTextAtSize(text, 14)
      if (measurer === fallback) fallback.draw(page, text, 20, 700, 14, undefined as never)
      else page.drawText(text, { x: 20, y: 700, size: 14, font: regular })
      expect(width).toBeGreaterThan(0)
    }).not.toThrow()

    await expect(pdf.save()).resolves.toBeInstanceOf(Uint8Array)
  })

  it('does not change behaviour for plain ASCII/English text (no regression)', async () => {
    const pdf = await PDFDocument.create()
    pdf.registerFontkit(fontkit)
    const regular = await pdf.embedFont(StandardFonts.TimesRoman)
    const entries = await embedUnicodeFallbackFonts(pdf, loadFallbackFontBytes())
    const fallback = buildUnicodeFallback(regular, entries)
    const text = 'John Smith, Patient Report'
    expect(cannotEncode(regular, text)).toBe(false)
    // Width via the fallback wrapper must match the primary font exactly for text it can encode —
    // proof the wrapper degrades to a no-op for every locale that already worked.
    expect(fallback.widthOfTextAtSize(text, 14)).toBeCloseTo(regular.widthOfTextAtSize(text, 14), 6)
  })
})
