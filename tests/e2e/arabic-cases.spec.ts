import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { PDFDocument } from 'pdf-lib'

const diagnoses = ['Existing dental implants', 'Existing dental restorations', 'Teeth are relatively aligned', 'Gingival inflammation', 'Dental caries', 'Malocclusion', 'Tooth wear', 'Missing teeth', 'Dental abscesses', 'Gingival recession', 'Dental crowding', 'Bone resorption']

async function prepare(page: import('@playwright/test').Page, name = 'نور الحسن') {
  await page.goto('/')
  await page.getByLabel('Document language').selectOption('ar')
  await page.getByLabel('Patient name').fill(name)
  await page.locator('[name="patient.age"]').fill('42')
  await page.locator('[name="patient.phone"]').fill('+90 555 777 8899')
}

async function fillRow(page: import('@playwright/test').Page, visit: 'firstVisit' | 'secondVisit', index: number, treatment: string, quality: string, quantity: number, price: number) {
  await page.locator(`[name="${visit}.treatmentRows.${index}.customTreatment"]`).fill(treatment)
  await page.locator(`[name="${visit}.treatmentRows.${index}.quality"]`).fill(quality)
  await page.locator(`[name="${visit}.treatmentRows.${index}.quantity"]`).fill(String(quantity))
  await page.locator(`[name="${visit}.treatmentRows.${index}.unitPrice"]`).fill(String(price))
}

async function savePdf(page: import('@playwright/test').Page, output: string) {
  await expect(page.getByRole('button', { name: 'Download PDF' })).toBeEnabled({ timeout: 30_000 })
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PDF' }).click()
  await (await pending).saveAs(output)
  expect((await PDFDocument.load(await readFile(output))).getPageCount()).toBe(5)
}

test('Arabic case A - normal patient', async ({ page }, testInfo) => {
  await prepare(page); await fillRow(page, 'firstVisit', 0, 'تنظيف الأسنان', 'علاج قياسي', 1, 145)
  await savePdf(page, testInfo.outputPath('case-a-normal.pdf'))
})

test('Arabic case B - long patient name', async ({ page }, testInfo) => {
  await prepare(page, 'السيدة نور عبد الرحمن مصطفى إبراهيم الحسن')
  await savePdf(page, testInfo.outputPath('case-b-long-name.pdf'))
})

test('Arabic case C - all diagnoses', async ({ page }, testInfo) => {
  await prepare(page)
  for (const diagnosis of diagnoses) await page.getByText(diagnosis, { exact: true }).click()
  await savePdf(page, testInfo.outputPath('case-c-all-diagnoses.pdf'))
})

test('Arabic case D - maximum first-visit rows', async ({ page }, testInfo) => {
  await prepare(page)
  for (let index = 0; index < 7; index += 1) await fillRow(page, 'firstVisit', index, `علاج مخصص ${index + 1}`, `جودة ${index + 1}`, index + 1, 101 + index)
  await savePdf(page, testInfo.outputPath('case-d-seven-rows.pdf'))
})

test('Arabic case E - included service', async ({ page }, testInfo) => {
  await prepare(page)
  await page.locator('[name="firstVisit.treatmentRows.0.customTreatment"]').fill('الفندق + مواصلات VIP')
  await page.locator('[name="firstVisit.treatmentRows.0.quality"]').fill('4 نجوم')
  await page.getByText('Included', { exact: true }).first().click()
  await page.locator('[name="firstVisit.treatmentRows.0.duration"]').fill('7 ليالي / 8 أيام')
  await savePdf(page, testInfo.outputPath('case-e-included.pdf'))
})

test('Arabic case F - discount enabled', async ({ page }, testInfo) => {
  await prepare(page); await fillRow(page, 'firstVisit', 0, 'زراعة أسنان', 'مادة ألمانية', 2, 310)
  await page.getByLabel('Apply discount').check(); await page.locator('[name="firstVisit.discountedFinalPrice"]').fill('590')
  await savePdf(page, testInfo.outputPath('case-f-discount.pdf'))
})

test('Arabic case G - discount disabled', async ({ page }, testInfo) => {
  await prepare(page); await fillRow(page, 'firstVisit', 0, 'تاج إيماكس', 'درجة أولى', 3, 155)
  await expect(page.getByLabel('Apply discount')).not.toBeChecked()
  await savePdf(page, testInfo.outputPath('case-g-no-discount.pdf'))
})

test('Arabic case H - second visit populated', async ({ page }, testInfo) => {
  await prepare(page); await fillRow(page, 'secondVisit', 0, 'تاج زيركونيوم', 'إيفوكلار', 5, 135)
  await savePdf(page, testInfo.outputPath('case-h-second-visit.pdf'))
})
