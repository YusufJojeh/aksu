import { expect, test } from '@playwright/test'

test('English PDF page remains aligned with A4 template', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium')
  await page.goto('/')
  await page.getByLabel('Patient name').fill('A very long patient name for layout verification Adrian Jacek')
  await page.getByLabel('Phone').fill('+44 7985 747921')
  const canvas = page.getByRole('region', { name: 'PDF preview' }).locator('canvas')
  await expect(canvas).toBeVisible({ timeout: 20_000 })
  await expect(canvas).toHaveScreenshot('english-page-1.png', { maxDiffPixelRatio: 0.02 })
})
