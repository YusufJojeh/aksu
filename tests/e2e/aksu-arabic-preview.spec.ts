import { expect, test } from '@playwright/test'
import { selectClinic } from './helpers/selectClinic'

test('Aksu Arabic preview preserves shaped static Arabic artwork', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium')
  await page.setViewportSize({ width: 1440, height: 1400 })
  await page.goto('/')
  await selectClinic(page, 'aksu')
  const templateResponse = page.waitForResponse((response) => response.url().includes('/templates/aksu/ar.pdf') && response.ok())
  await page.getByLabel('Document language').selectOption('ar')
  await templateResponse
  await expect(page.getByText('Generating preview…')).toBeHidden({ timeout: 20_000 })
  const canvases = page.getByRole('region', { name: 'PDF preview' }).locator('canvas')
  await expect(canvases).toHaveCount(5, { timeout: 20_000 })
  const staticPage = canvases.nth(2)
  await expect.poll(() => staticPage.evaluate((node: HTMLCanvasElement) => node.width > 600 && node.height > 900), { timeout: 20_000 }).toBe(true)
  await expect(staticPage).toHaveScreenshot('aksu-ar-page-3-preview.png', { maxDiffPixelRatio: 0.01 })
})
