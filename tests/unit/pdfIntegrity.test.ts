// @vitest-environment node
import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { assertArchivedDocumentPdf, assertArchivedPdf, isArchivedDocumentKind } from '../../src/lib/pdfIntegrity'

async function pdfWithPages(count: number, drawn = true): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  for (let index = 0; index < count; index += 1) {
    const page = pdf.addPage()
    if (drawn) page.drawText(`page ${index + 1}`)
  }
  return pdf.save()
}

describe('archived PDF integrity', () => {
  it('requires five drawn pages for a treatment report', async () => {
    await expect(assertArchivedPdf(await pdfWithPages(5))).resolves.toBeUndefined()
    await expect(assertArchivedPdf(await pdfWithPages(4))).rejects.toThrow('five-page')
    await expect(assertArchivedPdf(await pdfWithPages(5, false))).rejects.toThrow('five-page')
  })

  it('checks each document kind against its own template page count', async () => {
    await expect(assertArchivedDocumentPdf(await pdfWithPages(2), 'warranty')).resolves.toBeUndefined()
    await expect(assertArchivedDocumentPdf(await pdfWithPages(1), 'invitation')).resolves.toBeUndefined()
    await expect(assertArchivedDocumentPdf(await pdfWithPages(1), 'warranty')).rejects.toThrow('warranty')
    await expect(assertArchivedDocumentPdf(new TextEncoder().encode('not a pdf'), 'invitation')).rejects.toThrow('invitation')
  })

  it('only recognises the archived document kinds', () => {
    expect(isArchivedDocumentKind('warranty')).toBe(true)
    expect(isArchivedDocumentKind('invitation')).toBe(true)
    expect(isArchivedDocumentKind('report')).toBe(false)
    expect(isArchivedDocumentKind('toString')).toBe(false)
  })
})
