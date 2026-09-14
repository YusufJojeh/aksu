import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { PDFDocument } from 'pdf-lib'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { selectClinic } from './helpers/selectClinic'

test('creates, localizes, previews, downloads and resets a report', async ({ page }, testInfo) => {
  await page.goto('/')
  await selectClinic(page, 'aksu')
  await expect(page.getByRole('heading', { name: 'Treatment plan' })).toBeVisible()
  await page.getByLabel('Patient name').fill('Adrian Jacek')
  await page.getByLabel('Phone').fill('+44 7985 747921')
  await page.getByText('Gingival inflammation', { exact: true }).click()
  await expect(page.getByTestId('firstVisit-total')).toContainText('0')
  await page.getByLabel('Interface language').selectOption('ar')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await page.getByLabel('لغة المستند').selectOption('ar')
  await page.getByLabel('اسم المريض').fill('محمد يوسف')
  await page.getByRole('button', { name: 'معاينة PDF' }).click()
  await expect(page.getByText('المعاينة جاهزة')).toBeAttached({ timeout: 20_000 }).catch(() => {})
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'تنزيل PDF' }).click()
  const completedDownload = await download
  expect(completedDownload.suggestedFilename()).toMatch(/Doctor-Aksu-Treatment-Plan_محمد_يوسف_.*_AR\.pdf/)
  await completedDownload.saveAs(testInfo.outputPath('arabic-treatment-plan.pdf'))
  await page.getByRole('button', { name: 'إعادة ضبط النموذج' }).click()
  await page.getByRole('button', { name: 'تأكيد' }).click()
  await expect(page.getByLabel('اسم المريض')).toHaveValue('')
})

test('mobile uses edit and preview navigation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile')
  await page.goto('/')
  await selectClinic(page, 'aksu')
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
    if (request.url().includes('/templates/aksu/en.pdf')) templateRequests += 1
    if (request.url().includes('/fonts/NotoSansArabic-Regular.woff')) fontRequests += 1
  })
  await page.goto('/')
  await selectClinic(page, 'aksu')
  await page.getByLabel('Patient name').fill('Preview Patient')
  await page.getByLabel('Phone').fill('+44 7000 000000')
  const canvases = page.getByRole('region', { name: 'PDF preview' }).locator('canvas')
  const canvas = canvases.first()
  await expect.poll(async () => canvas.evaluate((element) => {
    const node = element as HTMLCanvasElement
    if (!node.width || !node.height) return false
    const pixels = node.getContext('2d')?.getImageData(0, 0, Math.min(40, node.width), Math.min(40, node.height)).data
    return Boolean(pixels && Array.from(pixels).some((value, index) => index % 4 !== 3 && value < 245))
  }), { timeout: 20_000 }).toBe(true)
  await expect(canvases).toHaveCount(5)
  await page.waitForTimeout(3_000)
  expect(errors).toEqual([])
  expect(templateRequests).toBe(1)
  expect(fontRequests).toBe(1)
})

test('interface language picker exposes every readable locale', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium')
  await page.goto('/')
  await selectClinic(page, 'aksu')
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
  await selectClinic(page, 'aksu')
  await page.getByLabel('Patient name').fill('Adrian Jacek')
  await page.getByLabel('Phone').fill('+44 7985 747921')
  let pending = page.waitForEvent('download')
  await expect(page.getByRole('button', { name: 'Download PDF' })).toBeEnabled()
  await page.getByRole('button', { name: 'Download PDF' }).click()
  await (await pending).saveAs(testInfo.outputPath('english-treatment-plan.pdf'))
  await page.getByLabel('Document language').selectOption('fr')
  await page.getByLabel('Patient name').fill('Jean-Baptiste Alexandre de la Rochefoucauld')
  pending = page.waitForEvent('download')
  await expect(page.getByRole('button', { name: 'Download PDF' })).toBeEnabled()
  await page.getByRole('button', { name: 'Download PDF' }).click()
  await (await pending).saveAs(testInfo.outputPath('french-treatment-plan.pdf'))
})

test('generates a private five-page Arabic report from the preview Blob', async ({ page }, testInfo) => {
  let templateRequests = 0
  page.on('request', (request) => { if (request.url().includes('/templates/aksu/ar.pdf')) templateRequests += 1 })
  await page.goto('/')
  await selectClinic(page, 'aksu')
  await page.getByLabel('Document language').selectOption('ar')
  await expect(page.getByLabel('Currency')).toHaveValue('EUR')
  await page.getByLabel('Patient name').fill('ليلى الجديدة')
  await page.getByLabel('Phone').fill('+90 555 111 2233')
  for (const label of ['Existing dental implants', 'Existing dental restorations', 'Teeth are relatively aligned', 'Gingival inflammation', 'Dental caries', 'Malocclusion', 'Tooth wear', 'Missing teeth', 'Dental abscesses', 'Gingival recession', 'Dental crowding', 'Bone resorption']) {
    await page.getByText(label, { exact: true }).click()
  }
  await page.locator('[name="firstVisit.treatmentRows.0.customTreatment"]').fill('زراعة أسنان')
  await page.locator('[name="firstVisit.treatmentRows.0.quality"]').fill('مادة ألمانية')
  await page.locator('[name="firstVisit.treatmentRows.0.quantity"]').fill('2')
  await page.locator('[name="firstVisit.treatmentRows.0.unitPrice"]').fill('310')
  await page.getByLabel('Apply discount').check()
  await expect(page.locator('[name="firstVisit.discountExpiryDate"]')).toHaveCount(0)
  await page.locator('[name="firstVisit.discountedFinalPrice"]').fill('590')
  await page.locator('[name="secondVisit.treatmentRows.0.customTreatment"]').fill('تاج زيركونيوم')
  await page.locator('[name="secondVisit.treatmentRows.0.quality"]').fill('إيفوكلار')
  await page.locator('[name="secondVisit.treatmentRows.0.quantity"]').fill('5')
  await page.locator('[name="secondVisit.treatmentRows.0.unitPrice"]').fill('135')
  await expect(page.getByRole('button', { name: 'Download PDF' })).toBeEnabled({ timeout: 30_000 })
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PDF' }).click()
  const download = await pending
  const output = testInfo.outputPath('arabic-private-report.pdf')
  await download.saveAs(output)
  expect(templateRequests).toBe(1)

  const bytes = new Uint8Array(await readFile(output))
  expect((await PDFDocument.load(bytes)).getPageCount()).toBe(5)
  const pdf = await getDocument({ data: bytes.slice() }).promise
  let extracted = ''
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const content = await (await pdf.getPage(pageNumber)).getTextContent()
    extracted += content.items.map((item) => 'str' in item ? item.str : '').join(' ')
  }
  // eslint-disable-next-line no-control-regex -- embedded-font extraction may contain PDF character-map controls
  extracted = extracted.replace(/[\u0000-\u001F]/g, '')
  expect(extracted).toContain('ليلى الجديدة')
  for (const stale of ['سكينة', '02/09/2026', '+34 613 43 52 52', '30 سنة', '4315', '3970', '3240', '975', '480']) {
    expect(extracted).not.toContain(stale)
  }
})
