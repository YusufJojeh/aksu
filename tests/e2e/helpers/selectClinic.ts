import type { Page } from '@playwright/test'

const clinicDisplayNames = { aksu: 'Dr. Emir Aksu', 'mb-dental': 'MB Dental' } as const

export type ClinicId = keyof typeof clinicDisplayNames

/** Clicks the clinic card on the `ClinicSelect` screen. Callers navigate first (`page.goto`). */
export async function selectClinic(page: Page, clinicId: ClinicId): Promise<void> {
  await page.getByRole('button', { name: new RegExp(`^${clinicDisplayNames[clinicId]}`) }).click()
}
