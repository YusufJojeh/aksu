import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { PDFDocument } from 'pdf-lib'
import { selectClinic } from './helpers/selectClinic'

const fallbackBanner = {
  fr: 'Le visuel anglais est utilisé.',
  es: 'Se usa el diseño inglés.',
} as const

// Aksu offers every interface locale and falls back to its English artwork, so the guarantee worth
// testing is the opposite of MB's: French and Spanish must fetch their OWN template, never en.pdf.
for (const locale of ['fr', 'es'] as const) {
  test(`Aksu draws ${locale} on its own five-page artwork, never the English fallback`, async ({ page }, testInfo) => {
    const requested: string[] = []
    page.on('request', (request) => {
      const match = /\/templates\/aksu\/([a-z]+)\.pdf/.exec(request.url())
      if (match) requested.push(match[1]!)
    })
    await page.goto('/')
    await selectClinic(page, 'aksu')
    await page.getByLabel('Document language').selectOption(locale)
    await page.getByLabel('Patient name').fill('Mr FARID')
    await page.getByLabel('Phone', { exact: true }).fill('+33 6 12 34 56 78')
    await page.getByText('Gingival inflammation', { exact: true }).click()
    await expect(page.getByRole('button', { name: 'Download PDF' })).toBeEnabled({ timeout: 30_000 })
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download PDF' }).click()
    const completed = await download
    const output = testInfo.outputPath(`aksu-${locale}.pdf`)
    await completed.saveAs(output)
    const pdf = await PDFDocument.load(new Uint8Array(await readFile(output)))
    expect(pdf.getPageCount()).toBe(5)
    const [first] = pdf.getPages()
    // A4 portrait, matching the supplied artwork exactly — no page-size drift.
    expect(first!.getWidth()).toBeCloseTo(595.276, 2)
    expect(first!.getHeight()).toBeCloseTo(841.89, 2)
    // The workspace opens on English, so the guarantee is that switching pulled this locale's own
    // artwork and that the last template served was it — never a silent fall back to en.pdf.
    expect(requested.at(-1)).toBe(locale)
    // The fallback banner must stay hidden: this locale has real artwork.
    await expect(page.getByText(fallbackBanner[locale])).toHaveCount(0)
  })
}
