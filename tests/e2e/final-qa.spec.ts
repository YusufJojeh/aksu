import { expect, test } from '@playwright/test'
import { mkdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { PDFDocument } from 'pdf-lib'

const live = process.env.QA_MODE === 'live'
const target = live
  ? (process.env.LIVE_BASE_URL ?? 'https://dist-ten-eta-38.vercel.app')
  : '/'
const artifactDir = path.join(process.cwd(), 'qa-artifacts')

async function assertPdf(file: string) {
  const info = await stat(file)
  expect(info.size).toBeGreaterThan(100_000)
  expect(path.extname(file)).toBe('.pdf')
  const pdf = await PDFDocument.load(await readFile(file))
  expect(pdf.getPageCount()).toBe(5)
  for (const page of pdf.getPages()) {
    expect(page.getWidth()).toBeGreaterThan(590)
    expect(page.getWidth()).toBeLessThan(600)
    expect(page.getHeight()).toBeGreaterThan(840)
    expect(page.getHeight()).toBeLessThan(845)
  }
}

async function downloadPdf(page: import('@playwright/test').Page, filename: string) {
  await expect(page.locator('footer button').last()).toBeEnabled({ timeout: 30_000 })
  const pending = page.waitForEvent('download')
  await page.locator('footer button').last().click()
  const download = await pending
  const file = path.join(artifactDir, filename)
  await download.saveAs(file)
  await assertPdf(file)
}

async function fillProductionReport(page: import('@playwright/test').Page) {
  await page.locator('[name="patient.name"]').fill('John Production Test')
  await page.locator('[name="patient.age"]').fill('34')
  await page.locator('[name="patient.phone"]').fill('+44 7700 900123')
  await page.locator('[name="document.currency"]').selectOption('GBP')
  const assessments = page.locator('section').filter({ hasText: 'Aesthetic assessment' }).locator('input[type="checkbox"]')
  for (const index of [0, 3, 4]) await assessments.nth(index).check({ force: true })
  const expected = [
    [1, 215], [20, 171], [2, 100], [0, 0], [1, 129], [2, 65], [0, 0],
  ]
  for (let index = 0; index < expected.length; index += 1) {
    await page.locator(`[name="firstVisit.treatmentRows.${index}.quantity"]`).fill(String(expected[index]![0]))
    if (index !== 6) await page.locator(`[name="firstVisit.treatmentRows.${index}.unitPrice"]`).fill(String(expected[index]![1]))
  }
  await expect(page.getByTestId('firstVisit-total')).toContainText('4,094')
  await page.getByLabel('Apply discount').check()
  await page.locator('[name="firstVisit.discountedFinalPrice"]').fill('3774')
  await page.locator('[name="firstVisit.discountExpiryDate"]').fill('2026-09-10')
  await page.locator('[name="firstVisit.treatmentRows.6.quality"]').fill('4 Stars')
  await page.getByText('Included', { exact: true }).nth(6).click()
  await page.locator('[name="firstVisit.treatmentRows.6.duration"]').fill('7 nights / 8 days')
  await page.locator('[name="secondVisit.treatmentRows.0.customTreatment"]').fill('Second visit gum review')
  await page.locator('[name="secondVisit.treatmentRows.0.quality"]').fill('Clinical review and healing assessment')
  await page.locator('[name="secondVisit.treatmentRows.0.quantity"]').fill('1')
  await page.locator('[name="secondVisit.treatmentRows.0.unitPrice"]').fill('125.50')
}

test('final production report QA', async ({ page }, testInfo) => {
  test.setTimeout(180_000)
  test.skip(testInfo.project.name !== 'chromium')
  await mkdir(artifactDir, { recursive: true })
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  const failedRequests: string[] = []
  const leakedRequests: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()}`))
  page.on('request', request => {
    const wire = `${request.url()} ${request.postData() ?? ''}`
    if (['John Production Test', '+44 7700 900123', 'يوسف محمد جوجة'].some(value => wire.includes(value))) leakedRequests.push(wire)
  })

  await page.goto(target, { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'Treatment plan' })).toBeVisible()
  await fillProductionReport(page)

  const canvas = page.getByRole('region', { name: 'PDF preview' }).locator('canvas')
  await expect.poll(() => canvas.evaluate((node: HTMLCanvasElement) => node.width > 500 && node.height > 700), { timeout: 30_000 }).toBe(true)

  for (const currency of ['GBP', 'EUR', 'USD', 'TRY']) {
    await page.locator('[name="document.currency"]').selectOption(currency)
    await expect(page.getByTestId('firstVisit-total')).toContainText('4,094')
    await expect(page.getByTestId('firstVisit-total')).not.toContainText(/NaN|Infinity/)
  }
  await page.locator('[name="document.currency"]').selectOption('GBP')

  await page.getByLabel('Apply discount').uncheck()
  await expect(page.locator('[name="firstVisit.discountedFinalPrice"]')).toHaveCount(0)
  await page.getByLabel('Apply discount').check()
  await page.locator('[name="firstVisit.discountMode"]').selectOption('percentage')
  await page.locator('[name="firstVisit.discountPercentage"]').fill('20')
  await expect(page.locator('section').filter({ hasText: 'Discount' }).getByText('£3,275.20')).toBeVisible()
  await page.locator('[name="firstVisit.discountMode"]').selectOption('manual_final_price')
  await page.locator('[name="firstVisit.discountedFinalPrice"]').fill('3774')

  await page.locator('[name="patient.age"]').fill('-1')
  await expect(page.locator('footer button').last()).toBeEnabled({ timeout: 30_000 })
  let invalidDownload = page.waitForEvent('download', { timeout: 1_000 }).catch(() => undefined)
  await page.locator('footer button').last().click()
  expect(await invalidDownload).toBeUndefined()
  await page.locator('[name="patient.age"]').fill('999')
  await expect(page.locator('footer button').last()).toBeEnabled({ timeout: 30_000 })
  invalidDownload = page.waitForEvent('download', { timeout: 1_000 }).catch(() => undefined)
  await page.locator('footer button').last().click()
  expect(await invalidDownload).toBeUndefined()
  await page.locator('[name="patient.age"]').fill('34')
  await page.locator('[name="patient.name"]').fill('')
  await expect(page.locator('footer button').last()).toBeEnabled({ timeout: 30_000 })
  invalidDownload = page.waitForEvent('download', { timeout: 1_000 }).catch(() => undefined)
  await page.locator('footer button').last().click()
  expect(await invalidDownload).toBeUndefined()
  await page.locator('[name="patient.name"]').fill('John Production Test')

  await downloadPdf(page, live ? 'live-en.pdf' : 'local-en.pdf')

  if (live) {
    await page.locator('[name="document.locale"]').selectOption('fr')
    await page.locator('[name="patient.name"]').fill('Jean-Pierre Alexandre de Montmorency')
    await downloadPdf(page, 'live-fr.pdf')

    await page.locator('.interface-language-select').selectOption('ar')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await page.locator('[name="document.locale"]').selectOption('ar')
    await page.locator('[name="patient.name"]').fill('يوسف محمد جوجة')
    await downloadPdf(page, 'live-ar.pdf')

    for (const locale of ['en', 'ar', 'fr', 'tr', 'de', 'es', 'ru', 'pl', 'it']) {
      await page.locator('.interface-language-select').selectOption(locale)
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr')
      await page.locator('[name="document.locale"]').selectOption(locale)
      await expect(page.locator('footer button').last()).toBeEnabled({ timeout: 30_000 })
    }
  }

  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
  expect(failedRequests).toEqual([])
  expect(leakedRequests).toEqual([])

  await page.locator('[name="patient.name"]').fill('Alexandros Konstantinos Papadopoulos-Worthington')
  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.locator('[name="patient.name"]')).toHaveValue('')
})

test('final mobile QA', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile')
  await page.goto(target, { waitUntil: 'networkidle' })
  await expect(page.getByRole('tab', { name: 'Edit' })).toBeVisible()
  await page.locator('[name="patient.name"]').fill('John Production Test')
  await page.locator('[name="patient.phone"]').fill('+44 7700 900123')
  await page.getByRole('tab', { name: 'Preview' }).click()
  await expect(page.getByRole('region', { name: 'PDF preview' })).toBeVisible()
  await expect(page.locator('footer button').last()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})
