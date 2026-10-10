import { PDFArray, PDFDocument, PDFRawStream } from 'pdf-lib'

/** Page counts of the MB Dental document templates (public/templates/mb-dental/documents). */
export const DOCUMENT_PAGE_COUNTS = { warranty: 2, invitation: 1 } as const
export type ArchivedDocumentKind = keyof typeof DOCUMENT_PAGE_COUNTS

export function isArchivedDocumentKind(value: unknown): value is ArchivedDocumentKind {
  return typeof value === 'string' && Object.hasOwn(DOCUMENT_PAGE_COUNTS, value)
}

/** Throws unless the bytes are a loadable PDF with exactly `pageCount` pages, each with drawn content. */
async function assertCompletePdf(bytes: Uint8Array, pageCount: number, message: string): Promise<void> {
  try {
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false })
    if (pdf.getPageCount() !== pageCount) throw new Error('Unexpected page count')
    for (const page of pdf.getPages()) {
      const contents = page.node.Contents()
      const streams = contents instanceof PDFArray
        ? contents.asArray().map((ref) => pdf.context.lookup(ref))
        : [contents]
      if (!streams.some((stream) => stream instanceof PDFRawStream && stream.getContents().length > 0)) {
        throw new Error('Empty page')
      }
    }
  } catch {
    throw new Error(message)
  }
}

/** Both released clinic templates contain five populated pages. */
export function assertArchivedPdf(bytes: Uint8Array): Promise<void> {
  return assertCompletePdf(bytes, 5, 'The archived file is not a complete five-page treatment PDF.')
}

/** A warranty certificate or invitation letter rendered onto its template. */
export function assertArchivedDocumentPdf(bytes: Uint8Array, kind: ArchivedDocumentKind): Promise<void> {
  return assertCompletePdf(bytes, DOCUMENT_PAGE_COUNTS[kind], `The archived file is not a complete ${kind} PDF.`)
}
