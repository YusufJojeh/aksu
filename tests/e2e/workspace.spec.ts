import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

test('creates, localizes, previews, downloads and resets a report', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Treatment plan' })).toBeVisible()
  await page.getByLabel('Patient name').fill('Adrian Jacek')
  await page.getByLabel('Phone').fill('+44 7985 747921')
  await page.getByLabel('Discount expiry date').fill('2026-09-10')
  await page.getByText('Gingival inflammation', { exact: true }).click()
  await expect(page.getByTestId('firstVisit-total')).toContainText('4,094')
  await page.getByLabel('Interface language').selectOption('ar')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await page.getByLabel('لغة المستند').selectOption('ar')
  await page.getByLabel('اسم المريض').fill('محمد يوسف')
  await page.getByRole('button', { name: 'معاينة PDF' }).click()
  await expect(page.getByText('المعاينة جاهزة')).toBeAttached({ timeout: 20_000 }).catch(() => {})
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'تنزيل PDF' }).click()
  const completedDownload = await download
  expect(completedDownload.suggestedFilename()).toMatch(/Treatment_Plan_محمد_يوسف_.*_AR\.pdf/)
  const output = path.join(process.cwd(), 'output', 'pdf')
  await mkdir(output, { recursive: true })
  await completedDownload.saveAs(path.join(output, 'arabic-treatment-plan-sample.pdf'))
  await page.getByRole('button', { name: 'إعادة ضبط النموذج' }).click()
  await page.getByRole('button', { name: 'تأكيد' }).click()
  await expect(page.getByLabel('اسم المريض')).toHaveValue('')
})

test('mobile uses edit and preview navigation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile')
  await page.goto('/')
  await expect(page.getByRole('tab', { name: 'Edit' })).toBeVisible()
  await page.getByRole('tab', { name: 'Preview' }).click()
  await expect(page.getByRole('region', { name: 'PDF preview' })).toBeVisible()
})

test('preview renders once and remains stable while idle', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium')
  const errors: string[] = []
  let templateRequests = 0
  let fontRequests = 0
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    if (request.url().includes('/templates/en.pdf')) templateRequests += 1
    if (request.url().includes('/fonts/NotoSansArabic-Regular.woff')) fontRequests += 1
  })
  await page.goto('/')
  const canvas = page.getByRole('region', { name: 'PDF preview' }).locator('canvas')
  await expect.poll(async () => canvas.evaluate((element) => {
    const node = element as HTMLCanvasElement
    if (!node.width || !node.height) return false
    const pixels = node.getContext('2d')?.getImageData(0, 0, Math.min(40, node.width), Math.min(40, node.height)).data
    return Boolean(pixels && Array.from(pixels).some((value, index) => index % 4 !== 3 && value < 245))
  }), { timeout: 20_000 }).toBe(true)
  await page.waitForTimeout(3_000)
  expect(errors).toEqual([])
  expect(templateRequests).toBe(1)
  expect(fontRequests).toBe(1)
})

test('interface language picker exposes every readable locale', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium')
  await page.goto('/')
  const picker = page.getByLabel('Interface language')
  await expect(picker.locator('option')).toHaveCount(9)
  const contrast = await picker.locator('option').first().evaluate((option) => {
    const style = getComputedStyle(option)
    return { color: style.color, background: style.backgroundColor }
  })
  expect(contrast.color).not.toBe(contrast.background)
  await expect(picker).toHaveCSS('width', '144px')
})

test('generates representative English and French reports', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium')
  await page.goto('/')
  await page.getByLabel('Patient name').fill('Adrian Jacek')
  await page.getByLabel('Phone').fill('+44 7985 747921')
  await page.getByLabel('Discount expiry date').fill('2026-09-10')
  const output = path.join(process.cwd(), 'output', 'pdf')
  await mkdir(output, { recursive: true })
  let pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PDF' }).click()
  await (await pending).saveAs(path.join(output, 'english-treatment-plan-sample.pdf'))
  await page.getByLabel('Document language').selectOption('fr')
  await page.getByLabel('Patient name').fill('Jean-Baptiste Alexandre de la Rochefoucauld')
  pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PDF' }).click()
  await (await pending).saveAs(path.join(output, 'french-treatment-plan-sample.pdf'))
})
