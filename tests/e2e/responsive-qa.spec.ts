import { expect, test } from '@playwright/test'
import { selectClinic } from './helpers/selectClinic'

const viewports = [
  { name: '320x568', width: 320, height: 568 },
  { name: '360x800', width: 360, height: 800 },
  { name: '375x812', width: 375, height: 812 },
  { name: '390x844', width: 390, height: 844 },
  { name: '412x915', width: 412, height: 915 },
  { name: '812x375-landscape', width: 812, height: 375 },
  { name: '768x1024-tablet', width: 768, height: 1024 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1280x720', width: 1280, height: 720 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
  // 1366x768 at browser zoom: the CSS viewport shrinks by the zoom factor.
  { name: '1366x768@125%', width: 1093, height: 614 },
  { name: '1366x768@150%', width: 911, height: 512 },
  { name: '1366x768@200%', width: 683, height: 384 },
]

test.describe.configure({ mode: 'serial' })

for (const viewport of viewports) {
  test(`responsive ${viewport.name}`, async ({ page }, testInfo) => {
    // Every case sets its own viewport, so the mobile project would only repeat the same sizes.
    test.skip(testInfo.project.name !== 'chromium', 'viewport sweep is project-independent')
    const consoleErrors: string[] = []
    const failedRequests: string[] = []
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
    page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`))
    page.on('requestfailed', (request) => failedRequests.push(`${request.url()} ${request.failure()?.errorText}`))
    page.on('response', (response) => { if (response.status() >= 400) failedRequests.push(`${response.url()} ${response.status()}`) })

    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/')
    await selectClinic(page, 'aksu')
    await page.getByLabel('Patient name').fill('Mr FARID')
    await expect(page.locator('footer button').last()).toBeEnabled({ timeout: 30_000 })

    const overflow = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      widest: Array.from(document.querySelectorAll('*'))
        .filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
        .map((el) => `${el.tagName}.${(el as HTMLElement).className}`.slice(0, 80))
        .slice(0, 3),
    }))
    expect(overflow.widest, `horizontal overflow at ${viewport.name}`).toEqual([])
    expect(overflow.doc).toBeLessThanOrEqual(1)

    expect(consoleErrors, `console errors at ${viewport.name}`).toEqual([])
    expect(failedRequests, `failed requests at ${viewport.name}`).toEqual([])
  })
}

test('Arabic RTL interface stays usable and mirrored', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'viewport sweep is project-independent')
  const consoleErrors: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`))
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await selectClinic(page, 'mb-dental')
  await page.getByLabel('Interface language').selectOption('ar')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await page.locator('[name="patient.name"]').fill('فريد')
  await expect(page.locator('footer button').last()).toBeEnabled({ timeout: 30_000 })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
  expect(consoleErrors).toEqual([])
})
