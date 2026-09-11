import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { describe, expect, it } from 'vitest'

describe('sanitized Arabic template', () => {
  it('has five pages and exposes none of the old sample data', async () => {
    const data = new Uint8Array(await readFile(path.join(process.cwd(), 'public/templates/ar.pdf')))
    const pdf = await getDocument({ data }).promise
    expect(pdf.numPages).toBe(5)
    let extracted = ''
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      extracted += content.items.map((item) => 'str' in item ? item.str : '').join(' ')
    }
    for (const stale of ['سكينة', '02/09/2026', '+34 613 43 52 52', '30 سنة', '4315', '3970', '3240', '975', '480']) {
      expect(extracted).not.toContain(stale)
    }
  })
})
