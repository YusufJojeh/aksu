import { expect, test } from '@playwright/test'
import { PDFDocument } from 'pdf-lib'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import type { ArchivedReport } from '../../src/lib/operations'

test('admin re-downloads exact originals and rejects missing or blank archives', async ({ page }, testInfo) => {
  test.skip(!testInfo.config.configFile?.endsWith('playwright.archive.config.ts'), 'Requires isolated mocked authentication server')
  const pdf = await PDFDocument.create()
  for (let i = 0; i < 5; i++) pdf.addPage().drawText(`Original report page ${i + 1}`)
  const original = Buffer.from(await pdf.save())
  const blank = await PDFDocument.create(); blank.addPage([200, 200])
  const blankBytes = Buffer.from(await blank.save())
  const user = { id: '00000000-0000-4000-8000-000000000001', email: 'archive@example.test', aud: 'authenticated', role: 'authenticated' }
  const profile = { ...user, full_name: 'Archive Tester', role: 'ADMIN', status: 'active' }
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`
  const reports = ['original', 'missing', 'blank'].map((kind) => ({
    id: kind, created_by_employee_id: user.id, clinic_id: 'aksu', document_locale: 'en', currency: 'EUR',
    patient_name: `${kind} patient`, patient_phone: '+905551112233', finalized_at: '2026-09-14T00:00:00Z',
    employee_name_snapshot: 'Archive Tester', employee_phone_snapshot: '+905551112233',
    first_visit_total_minor: 12500, second_visit_total_minor: 0,
    pdf_storage_key: `${user.id}/${kind}.pdf`, pdf_sha256: createHash('sha256').update(kind === 'blank' ? blankBytes : original).digest('hex'),
    report_payload: { clinicId: 'aksu', patient: { name: 'Original patient' }, firstVisit: { treatmentRows: [] } },
  }))
  let logged = 0
  await page.route('https://archive-tests.supabase.co/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/token')) return route.fulfill({ json: { access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, user } })
    if (url.pathname.endsWith('/user')) return route.fulfill({ json: user })
    if (url.pathname.includes('/profiles')) return route.fulfill({ json: route.request().headers().accept?.includes('object') ? profile : [profile] })
    if (url.pathname.includes('/rpc/log_report_download')) { logged++; return route.fulfill({ json: null }) }
    if (url.pathname.includes('/rest/v1/reports')) {
      const id = url.searchParams.get('id')?.replace('eq.', '')
      return route.fulfill({ json: id ? reports.find((report) => report.id === id) : reports })
    }
    if (url.pathname.includes('/storage/')) {
      if (url.pathname.endsWith('/missing.pdf')) return route.fulfill({ status: 400, json: { statusCode: '404', error: 'not_found', message: 'Object not found' } })
      return route.fulfill({ contentType: 'application/pdf', body: url.pathname.endsWith('/blank.pdf') ? blankBytes : original })
    }
    return route.fulfill({ json: [] })
  })
  await page.goto('/admin')
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('test-password-only')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Toggle Sidebar' }).click()
  await page.getByRole('button', { name: 'Reports', exact: true }).click()
  if (testInfo.project.name === 'mobile') {
    // Close the sidebar after navigation if its modal overlay remains open.
    await page.keyboard.press('Escape')
  }
  const downloads: string[] = []
  page.on('download', (download) => downloads.push(download.suggestedFilename()))
  for (const kind of ['original', 'original', 'missing', 'blank', 'original']) {
    let button = page.getByRole('button', { name: `Download ${kind}`, exact: true })
    if (testInfo.project.name === 'mobile') {
      const details = page.locator('details').filter({ hasText: `${kind} patient` })
      if (await details.getAttribute('open') === null) await details.locator('summary').click()
      button = details.getByRole('button', { name: 'Download', exact: true })
    }
    if (kind !== 'original') {
      await button.click()
      await expect(page.getByRole('alert')).toContainText(kind === 'missing' ? 'missing from storage' : 'incomplete or damaged')
      continue
    }
    const downloadPromise = page.waitForEvent('download')
    await button.click()
    const download = await downloadPromise
    const path = testInfo.outputPath(`${kind}-${logged}.pdf`)
    await download.saveAs(path)
    const downloaded = await readFile(path)
    expect(downloaded.equals(original)).toBe(true)
  }
  expect(logged).toBe(3)
  expect(downloads).toHaveLength(3)
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('a user finalizes a generated template and re-downloads the saved bytes', async ({ page }, testInfo) => {
  test.skip(!testInfo.config.configFile?.endsWith('playwright.archive.config.ts'), 'Requires isolated mocked authentication server')
  const user = { id: '00000000-0000-4000-8000-000000000001', email: 'sales@example.test', aud: 'authenticated', role: 'authenticated' }
  const profile = { ...user, full_name: 'Sales Tester', role: 'SALES', status: 'active', requested_phone_e164: '+905551112233' }
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`
  let stored: Buffer | undefined
  let archived: ArchivedReport | undefined
  let finalizations = 0
  let logged = 0
  await page.route('**/api/reports/verify-pdf', async (route) => {
    expect(stored).toBeDefined()
    return route.fulfill({ json: { sha256: createHash('sha256').update(stored!).digest('hex') } })
  })
  await page.route('https://archive-tests.supabase.co/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname.endsWith('/token')) return route.fulfill({ json: { access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, user } })
    if (url.pathname.endsWith('/user')) return route.fulfill({ json: user })
    if (url.pathname.includes('/profiles')) return route.fulfill({ json: request.headers().accept?.includes('object') ? profile : [profile] })
    if (url.pathname.includes('/storage/')) {
      if (request.method() === 'POST') {
        const data = await new Response(request.postDataBuffer(), { headers: { 'content-type': request.headers()['content-type']! } }).formData()
        const file = Array.from(data.values()).find((value) => typeof value !== 'string') as File
        stored = Buffer.from(await file.arrayBuffer())
        return route.fulfill({ json: { Key: url.pathname.split('/object/')[1] } })
      }
      return route.fulfill({ contentType: 'application/pdf', body: stored! })
    }
    if (url.pathname.endsWith('/rpc/finalize_report')) {
      finalizations++
      const args = request.postDataJSON()
      archived = {
        id: '00000000-0000-4000-8000-000000000010', created_by_employee_id: user.id,
        clinic_id: args.p_clinic_id, document_locale: args.p_document_locale, currency: args.p_currency,
        patient_name: args.p_patient_name, patient_phone: args.p_patient_phone, report_payload: args.p_report_payload,
        first_visit_total_minor: args.p_first_visit_total_minor, second_visit_total_minor: args.p_second_visit_total_minor,
        employee_name_snapshot: profile.full_name, employee_phone_snapshot: profile.requested_phone_e164,
        template_version: args.p_template_version, finalized_at: '2026-09-14T00:00:00Z',
        pdf_storage_key: args.p_pdf_storage_key, pdf_sha256: args.p_pdf_sha256,
      }
      return route.fulfill({ json: archived })
    }
    if (url.pathname.endsWith('/rpc/log_report_download')) { logged++; return route.fulfill({ json: null }) }
    if (url.pathname.endsWith('/reports')) return route.fulfill({ json: url.searchParams.has('id') ? archived : [archived] })
    return route.fulfill({ json: [] })
  })
  await page.goto('/')
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('test-password-only')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByRole('button', { name: /^Dr. Emir Aksu/ }).click()
  await page.getByLabel('Patient name', { exact: true }).fill('Saved Original')
  await page.getByLabel('Phone', { exact: true }).fill('+905551112233')
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt === 2) {
      await page.getByRole('button', { name: 'My Reports', exact: true }).click()
      if (testInfo.project.name === 'mobile') await page.locator('summary').click()
    }
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /Download/ }).filter({ visible: true }).click()
    const download = await downloadPromise
    const path = testInfo.outputPath(`saved-original-${attempt}.pdf`)
    await download.saveAs(path)
    const downloaded = await readFile(path)
    expect(downloaded.equals(stored!)).toBe(true)
    expect(download.suggestedFilename()).toContain('Saved_Original')
    expect((await PDFDocument.load(downloaded)).getPageCount()).toBe(5)
    expect(downloaded.length).toBeGreaterThan(100_000)
  }
  expect(finalizations).toBe(1)
  expect(logged).toBe(3)
})
