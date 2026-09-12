import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { PDFDocument } from 'pdf-lib'
import { selectClinic } from './helpers/selectClinic'

test('MB Dental document language picker offers only its four evidenced locales', async ({ page }) => {
  await page.goto('/')
  await selectClinic(page, 'mb-dental')
  const picker = page.getByLabel('Document language')
  await expect(picker.locator('option')).toHaveCount(4)
  const values = await picker.locator('option').evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value))
  expect(values.sort()).toEqual(['ar', 'de', 'en', 'fr'])
})

for (const locale of ['en', 'fr', 'de', 'ar'] as const) {
  test(`MB Dental regenerates a five-page report in ${locale}`, async ({ page }, testInfo) => {
    let templateRequests = 0
    page.on('request', (request) => { if (request.url().includes(`/templates/mb-dental/${locale}.pdf`)) templateRequests += 1 })
    await page.goto('/')
    await selectClinic(page, 'mb-dental')
    await page.getByLabel('Document language').selectOption(locale)
    await page.locator('[name="patient.name"]').fill('Marie Dupont')
    await page.locator('[name="patient.patientId"]').fill('MB-2001')
    await page.locator('[name="patient.phone"]').fill('+33 6 00 00 00 00')
    await expect(page.getByRole('button', { name: 'Download PDF' })).toBeEnabled({ timeout: 30_000 })
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download PDF' }).click()
    const completedDownload = await download
    expect(completedDownload.suggestedFilename()).toMatch(new RegExp(`MB-Dental-Treatment-Plan_.*_${locale.toUpperCase()}\\.pdf`))
    const output = testInfo.outputPath(`mb-${locale}.pdf`)
    await completedDownload.saveAs(output)
    const bytes = new Uint8Array(await readFile(output))
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(5)
    expect(templateRequests).toBe(1)
  })
}
