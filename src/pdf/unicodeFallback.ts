import fontkit from '@pdf-lib/fontkit'
import type { Color, PDFDocument, PDFFont, PDFPage } from 'pdf-lib'

/**
 * pdf-lib's StandardFonts (Times/Helvetica) use WinAnsi encoding: `font.widthOfTextAtSize` throws
 * for any character outside cp1252 (e.g. Cyrillic "Л", Polish "ą", Turkish "İ"). That throw is the
 * exact P0 crash. Custom embedded TTF/OTF fonts never throw this way — fontkit just falls back to
 * the font's .notdef glyph for an unmapped codepoint — but a single font file rarely has glyphs for
 * every script we need (Google's subset files split Cyrillic, Latin Extended-A, and base Latin into
 * separate files). This module builds a small per-character fallback chain: probe the primary
 * WinAnsi font first (so unaffected locales keep their exact existing font/metrics), and only for
 * characters it cannot encode, split into runs drawn with whichever fallback font actually has that
 * glyph.
 */

export interface UnicodeFallback {
  /** Same signature as PDFFont#widthOfTextAtSize so this can be handed straight to fitTextToBox. */
  widthOfTextAtSize(text: string, size: number): number
  draw(page: PDFPage, text: string, x: number, y: number, size: number, color: Color): void
}

interface FallbackFontSource { url: string }

// Ordered by how much of cp1252 they overlap so the earliest capable entry in the chain wins:
// GeistLatin covers base Latin + the odd extras (e.g. dotless "ı") that a WinAnsi font lacks,
// GeistLatinExt covers Latin Extended-A/B (Polish, Turkish, Romanian, ...), GeistCyrillic covers
// Cyrillic (Russian and friends).
const FALLBACK_SOURCES: FallbackFontSource[] = [
  { url: './fonts/GeistLatin.woff2' },
  { url: './fonts/GeistLatinExt.woff2' },
  { url: './fonts/GeistCyrillic.woff2' },
]

let fallbackFontRequest: Promise<ArrayBuffer[]> | undefined

export async function loadUnicodeFallbackFontBytes(): Promise<ArrayBuffer[]> {
  fallbackFontRequest ??= Promise.all(
    FALLBACK_SOURCES.map((source) => fetch(source.url).then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(`Unable to load fallback font: ${source.url}`))))),
  ).catch((error) => {
    fallbackFontRequest = undefined
    throw error
  })
  return fallbackFontRequest
}

interface FallbackEntry { pdfFont: PDFFont; supports(codePoint: number): boolean }

/**
 * Embeds every fallback font and pairs each with a cheap glyph-coverage check (via a second,
 * fontkit-only parse of the same bytes — pdf-lib doesn't expose glyph lookups on `PDFFont`).
 * Subsetting is disabled: these variable-weight files trip pdf-lib's TrueType subsetter, and at
 * ~15-30KB apiece embedding them whole is inexpensive.
 */
export async function embedUnicodeFallbackFonts(pdf: PDFDocument, fontBytesList: (ArrayBuffer | Uint8Array)[]): Promise<FallbackEntry[]> {
  const entries: FallbackEntry[] = []
  for (const bytes of fontBytesList) {
    const pdfFont = await pdf.embedFont(bytes, { subset: false })
    const probe = fontkit.create(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes))
    entries.push({ pdfFont, supports: (codePoint) => probe.glyphForCodePoint(codePoint).id !== 0 })
  }
  return entries
}

/** True when `font.widthOfTextAtSize` would throw for this text (a WinAnsi encoding gap). */
function primaryCannotEncode(font: PDFFont, text: string): boolean {
  try {
    font.widthOfTextAtSize(text, 1)
    return false
  } catch {
    return true
  }
}

function splitIntoFontRuns(text: string, primary: PDFFont, fallbacks: FallbackEntry[]): { text: string; font: PDFFont }[] {
  const fontFor = (char: string): PDFFont => {
    const codePoint = char.codePointAt(0) ?? 0
    if (!primaryCannotEncode(primary, char)) return primary
    const match = fallbacks.find((entry) => entry.supports(codePoint))
    return match?.pdfFont ?? fallbacks[fallbacks.length - 1]?.pdfFont ?? primary
  }
  const runs: { text: string; font: PDFFont }[] = []
  for (const char of text) {
    const font = fontFor(char)
    const last = runs[runs.length - 1]
    if (last && last.font === font) last.text += char
    else runs.push({ text: char, font })
  }
  return runs
}

/**
 * Builds a `widthOfTextAtSize`/`draw` pair that measures and renders `text` using `primary` where
 * possible and the fallback chain only for the characters `primary` cannot encode. When `text` is
 * fully representable in `primary`, every run collapses to one entry and behaviour is identical to
 * drawing with `primary` directly (no regression for existing locales).
 */
export function buildUnicodeFallback(primary: PDFFont, fallbacks: FallbackEntry[]): UnicodeFallback {
  return {
    widthOfTextAtSize(text, size) {
      return splitIntoFontRuns(text, primary, fallbacks).reduce((sum, run) => sum + run.font.widthOfTextAtSize(run.text, size), 0)
    },
    draw(page, text, x, y, size, color) {
      let cursor = x
      for (const run of splitIntoFontRuns(text, primary, fallbacks)) {
        page.drawText(run.text, { x: cursor, y, size, font: run.font, color })
        cursor += run.font.widthOfTextAtSize(run.text, size)
      }
    },
  }
}
