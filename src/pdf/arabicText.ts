import type { PDFDocument, PDFPage } from 'pdf-lib'
import type { FieldBox } from './coordinates'

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

export async function drawBrowserShapedText(pdf: PDFDocument, page: PDFPage, text: string, box: FieldBox, color = '#171515'): Promise<void> {
  await ensureArabicFont()
  const scale = 4
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(box.width * scale))
  canvas.height = Math.max(1, Math.ceil(box.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is unavailable')
  context.scale(scale, scale)
  context.direction = box.direction ?? 'rtl'
  context.textBaseline = 'middle'
  context.fillStyle = color
  context.textAlign = box.alignment === 'center' ? 'center' : box.alignment === 'left' ? 'left' : 'right'
  let fontSize = box.fontSize
  const minimum = box.minFontSize ?? 6
  context.font = `${fontSize}px TreatmentArabic, Arial, sans-serif`
  while (fontSize > minimum && context.measureText(text).width > box.width - 2) {
    fontSize -= 0.5
    context.font = `${fontSize}px TreatmentArabic, Arial, sans-serif`
  }
  const x = box.alignment === 'center' ? box.width / 2 : box.alignment === 'left' ? 1 : box.width - 1
  context.fillText(text, x, box.height / 2)
  const png = await pdf.embedPng(canvas.toDataURL('image/png'))
  page.drawImage(png, { x: box.x, y: box.y, width: box.width, height: box.height })
}
