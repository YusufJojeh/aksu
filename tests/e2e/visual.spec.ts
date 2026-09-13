import { expect, test } from '@playwright/test'
import { selectClinic } from './helpers/selectClinic'

test('English PDF page remains aligned with A4 template', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium')
  await page.setViewportSize({ width: 1440, height: 1400 })
  await page.goto('/')
  await selectClinic(page, 'aksu')
  await page.addStyleTag({ content: 'footer { display: none !important; } .sticky { position: static !important; }' })
  await page.getByLabel('Report date').fill('2026-09-12')
  await page.getByLabel('Patient name').fill('A very long patient name for layout verification Adrian Jacek')
  await page.getByLabel('Phone').fill('+44 7985 747921')
  const canvas = page.getByRole('region', { name: 'PDF preview' }).locator('canvas')
  await expect(canvas).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText('Generating preview…')).toBeHidden({ timeout: 20_000 })
  await expect.poll(() => canvas.evaluate((node: HTMLCanvasElement) => node.width > 700 && node.height > 1_000)).toBe(true)
  await expect(canvas).toHaveScreenshot('english-page-1.png', { maxDiffPixelRatio: 0.02 })
})
