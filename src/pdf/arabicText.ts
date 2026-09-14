import type { PDFDocument, PDFPage } from 'pdf-lib'
import type { FieldBox } from './profiles/shared/fieldBox'

let fontReady: Promise<void> | undefined

async function ensureArabicFont(): Promise<void> {
  if (fontReady) return fontReady
  fontReady = (async () => {
    const face = new FontFace('TreatmentArabic', 'url(./fonts/NotoSansArabic-Regular.woff)', { weight: '400' })
    await face.load()
    document.fonts.add(face)
    await document.fonts.ready
  })()
  return fontReady
}

export interface ShapedTextOptions {
  // Center the final shaped glyph ink (not the em box) inside `box`, keeping `padding` clear on
  // every side. Used by MB table cells; the default keeps the original em-box alignment for Aksu.
  centerInk?: boolean
  padding?: { x: number; y: number }
}

export async function drawBrowserShapedText(pdf: PDFDocument, page: PDFPage, text: string, box: FieldBox, color = '#171515', options: ShapedTextOptions = {}): Promise<void> {
  await ensureArabicFont()
  const scale = 4
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(box.width * scale))
  canvas.height = Math.max(1, Math.ceil(box.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is unavailable')
  context.scale(scale, scale)
  context.direction = box.direction ?? 'rtl'
  context.fillStyle = color
  let fontSize = box.fontSize
  const minimum = box.minFontSize ?? 6
  context.font = `${fontSize}px TreatmentArabic, Arial, sans-serif`
  if (options.centerInk) {
    const padding = options.padding ?? { x: 1, y: 1 }
    const maxWidth = box.width - 2 * padding.x
    const maxHeight = box.height - 2 * padding.y
    // measureText's actualBoundingBox* values describe the shaped run's real ink extents, so both
    // the shrink decision and the centering use what is actually painted rather than em-box guesses.
    const ink = () => {
      const metrics = context.measureText(text)
      return { metrics, width: metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight, height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent }
    }
    context.textAlign = 'left'
    context.textBaseline = 'alphabetic'
    let measured = ink()
    while (fontSize > minimum && (measured.width > maxWidth || measured.height > maxHeight)) {
      fontSize -= 0.5
      context.font = `${fontSize}px TreatmentArabic, Arial, sans-serif`
      measured = ink()
    }
    if (measured.width > box.width || measured.height > box.height) {
      throw new Error(`Text does not fit the calibrated PDF field: ${text.slice(0, 32)}`)
    }
    const { actualBoundingBoxLeft: left, actualBoundingBoxRight: right, actualBoundingBoxAscent: ascent, actualBoundingBoxDescent: descent } = measured.metrics
    context.fillText(text, box.width / 2 - (right - left) / 2, box.height / 2 + (ascent - descent) / 2)
  } else {
    context.textBaseline = 'middle'
    context.textAlign = box.alignment === 'center' ? 'center' : box.alignment === 'left' ? 'left' : 'right'
    while (fontSize > minimum && context.measureText(text).width > box.width - 2) {
      fontSize -= 0.5
      context.font = `${fontSize}px TreatmentArabic, Arial, sans-serif`
    }
    if (context.measureText(text).width > box.width - 2) {
      throw new Error(`Text does not fit the calibrated PDF field: ${text.slice(0, 32)}`)
    }
    const x = box.alignment === 'center' ? box.width / 2 : box.alignment === 'left' ? 1 : box.width - 1
    context.fillText(text, x, box.height / 2)
  }
  const png = await pdf.embedPng(canvas.toDataURL('image/png'))
  page.drawImage(png, { x: box.x, y: box.y, width: box.width, height: box.height })
}
