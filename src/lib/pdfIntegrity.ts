import { PDFArray, PDFDocument, PDFRawStream } from 'pdf-lib'

/** Both released clinic templates contain five populated pages. */
export async function assertArchivedPdf(bytes: Uint8Array): Promise<void> {
  try {
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false })
    if (pdf.getPageCount() !== 5) throw new Error('Unexpected page count')
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
    throw new Error('The archived file is not a complete five-page treatment PDF.')
  }
}
