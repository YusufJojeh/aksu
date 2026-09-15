import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { PDFDocument } from 'pdf-lib'
import { selectClinic } from './helpers/selectClinic'

test('MB Dental workspace: no form before clinic selection, EN default preview, fill and download a five-page report', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.locator('[name="patient.name"]')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Select a clinic' })).toBeVisible()

  await selectClinic(page, 'mb-dental')
  await expect(page.getByRole('heading', { name: 'Treatment plan' })).toBeVisible()
  await expect(page.getByText('MB Dental', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Document language')).toHaveValue('en')
  await expect(page.getByLabel('Currency')).toHaveValue('EUR')

  if (testInfo.project.name === 'mobile') await page.getByRole('tab', { name: 'Preview' }).click()
  const canvases = page.getByRole('region', { name: 'PDF preview' }).locator('canvas')
  const canvas = canvases.first()
  await expect(canvas).toBeVisible({ timeout: 20_000 })
  await expect(canvases).toHaveCount(5)
  if (testInfo.project.name === 'mobile') await page.getByRole('tab', { name: 'Edit' }).click()

  await page.getByLabel('Patient name').fill('Marie Dupont')
  await page.getByLabel('Patient ID').fill('MB-1042')
  await page.getByLabel('Phone', { exact: true }).fill('+33 6 12 34 56 78')
  await page.getByText('Missing Teeth', { exact: true }).click()
  await page.getByText('Dental Implants', { exact: true }).click()
  await page.locator('[name="firstVisit.treatmentRows.0.customTreatment"]').fill('Dental Implant')
  await page.locator('[name="firstVisit.treatmentRows.0.quality"]').fill('Titanium')
  await page.locator('[name="firstVisit.treatmentRows.0.quantity"]').fill('2')
  await page.locator('[name="firstVisit.treatmentRows.0.unitPrice"]').fill('450')

  await expect(page.getByRole('button', { name: 'Download PDF' })).toBeEnabled({ timeout: 30_000 })
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PDF' }).click()
  const completedDownload = await download
  expect(completedDownload.suggestedFilename()).toMatch(/MB-Dental-Treatment-Plan_Marie_Dupont_.*_EN\.pdf/)
  const output = testInfo.outputPath('mb-treatment-plan.pdf')
  await completedDownload.saveAs(output)
  const bytes = new Uint8Array(await readFile(output))
  expect((await PDFDocument.load(bytes)).getPageCount()).toBe(5)
})

test('MB Dental has no discount section', async ({ page }) => {
  await page.goto('/')
  await selectClinic(page, 'mb-dental')
  await expect(page.getByRole('heading', { name: 'Discount' })).toHaveCount(0)
  await expect(page.getByLabel('Apply discount')).toHaveCount(0)
})
