import { expect, test } from '@playwright/test'
import { selectClinic } from './helpers/selectClinic'

test('switching clinics after edits asks for confirmation and remounts with a clean form', async ({ page }) => {
  await page.goto('/')
  await selectClinic(page, 'aksu')
  await page.getByLabel('Patient name').fill('Adrian Jacek')
  await page.getByLabel('Phone').fill('+44 7985 747921')

  await page.getByRole('button', { name: 'Switch clinic' }).click()
  await expect(page.getByRole('heading', { name: 'Switch clinic?' })).toBeVisible()
  await page.getByRole('button', { name: 'Confirm' }).click()

  await expect(page.getByRole('heading', { name: 'Select a clinic' })).toBeVisible()

  await selectClinic(page, 'mb-dental')
  await expect(page.getByLabel('Patient name')).toHaveValue('')
  await expect(page.locator('[name="patient.patientId"]')).toHaveValue('')
})

test('switching clinics with no edits skips the confirmation dialog', async ({ page }) => {
  await page.goto('/')
  await selectClinic(page, 'aksu')
  await page.getByRole('button', { name: 'Switch clinic' }).click()
  await expect(page.getByRole('heading', { name: 'Select a clinic' })).toBeVisible()
})
