import { expect, test, type Page } from '@playwright/test'
import { selectClinic } from './helpers/selectClinic'

async function waitForPage(page: Page) {
  const canvas = page.getByRole('region', { name: 'PDF preview' }).locator('canvas')
  await expect.poll(() => canvas.evaluate((node: HTMLCanvasElement) => node.width > 600 && node.height > 900), { timeout: 20_000 }).toBe(true)
  return canvas
}

async function nextPage(page: Page, canvas: ReturnType<Page['locator']>, pageNumber: number) {
  const before = await canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL())
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(page.getByText(`Page ${pageNumber} of 5`)).toBeVisible()
  await expect.poll(() => canvas.evaluate((node: HTMLCanvasElement, previous) => node.toDataURL() !== previous, before), { timeout: 20_000 }).toBe(true)
}

for (const locale of ['fr', 'ar'] as const) {
  test(`MB ${locale} canonical pages remain aligned`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium')
    await page.setViewportSize({ width: 1440, height: 1400 })
    await page.goto('/')
    await selectClinic(page, 'mb-dental')
    await page.addStyleTag({ content: 'footer { display: none !important; } .sticky { position: static !important; }' })
    await page.getByLabel('Document language').selectOption(locale)
    await page.locator('[name="patient.reportDate"]').fill('2026-09-12')
    await page.locator('[name="patient.name"]').fill(locale === 'ar' ? 'مريض الاختبار المرجعي' : 'Patient Fixture de Référence')
    await page.locator('[name="patient.age"]').fill('42')
    await page.locator('[name="patient.patientId"]').fill('MB-REF-1042')
    await page.locator('[name="patient.phone"]').fill('+90 555 000 1042')
    await page.getByText('Missing Teeth', { exact: true }).click()
    await page.getByText('Dental Implants', { exact: true }).click()
    await page.locator('[name="firstVisit.treatmentRows.0.customTreatment"]').fill(locale === 'ar' ? 'زراعة الأسنان' : 'Implant dentaire')
    await page.locator('[name="firstVisit.treatmentRows.0.quality"]').fill(locale === 'ar' ? 'تيتانيوم' : 'Titane')
    await page.locator('[name="firstVisit.treatmentRows.0.quantity"]').fill('2')
    await page.locator('[name="firstVisit.treatmentRows.0.unitPrice"]').fill('450')

    let canvas = await waitForPage(page)
    await expect(canvas).toHaveScreenshot(`mb-${locale}-page-1.png`, { maxDiffPixelRatio: 0.01 })
    await nextPage(page, canvas, 2)
    canvas = await waitForPage(page)
    await expect(canvas).toHaveScreenshot(`mb-${locale}-page-2.png`, { maxDiffPixelRatio: 0.01 })
    await nextPage(page, canvas, 3)
    canvas = await waitForPage(page)
    await expect(canvas).toHaveScreenshot(`mb-${locale}-page-3.png`, { maxDiffPixelRatio: 0.01 })
  })
}
