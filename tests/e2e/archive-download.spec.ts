import { expect, test } from '@playwright/test'
import { PDFDocument } from 'pdf-lib'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import type { ArchivedReport } from '../../src/lib/operations'

test('admin re-downloads exact originals and rejects missing or blank archives', async ({ page }, testInfo) => {
  test.skip(
    !testInfo.config.configFile?.endsWith('playwright.archive.config.ts'),
    'Requires isolated mocked authentication server',
  )
  const pdf = await PDFDocument.create()
  for (let i = 0; i < 5; i++) pdf.addPage().drawText(`Original report page ${i + 1}`)
  const original = Buffer.from(await pdf.save())
  const blank = await PDFDocument.create()
  blank.addPage([200, 200])
  const blankBytes = Buffer.from(await blank.save())
  const user = {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'archive@example.test',
    aud: 'authenticated',
    role: 'authenticated',
  }
  const profile = { ...user, full_name: 'Archive Tester', role: 'ADMIN', status: 'active' }
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`
  const reports = ['original', 'missing', 'blank'].map((kind) => ({
    id: kind,
    created_by_employee_id: user.id,
    clinic_id: 'aksu',
    document_locale: 'en',
    currency: 'EUR',
    patient_name: `${kind} patient`,
    patient_phone: '+905551112233',
    finalized_at: '2026-09-14T00:00:00Z',
    employee_name_snapshot: 'Archive Tester',
    employee_phone_snapshot: '+905551112233',
    first_visit_total_minor: 12500,
    second_visit_total_minor: 0,
    pdf_storage_key: `${user.id}/${kind}.pdf`,
    pdf_sha256: createHash('sha256')
      .update(kind === 'blank' ? blankBytes : original)
      .digest('hex'),
    report_payload: { clinicId: 'aksu', patient: { name: 'Original patient' }, firstVisit: { treatmentRows: [] } },
  }))
  let logged = 0
  await page.route('https://archive-tests.supabase.co/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/token'))
      return route.fulfill({
        json: { access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, user },
      })
    if (url.pathname.endsWith('/user')) return route.fulfill({ json: user })
    if (url.pathname.includes('/profiles'))
      return route.fulfill({ json: route.request().headers().accept?.includes('object') ? profile : [profile] })
    if (url.pathname.includes('/rpc/log_report_download')) {
      logged++
      return route.fulfill({ json: null })
    }
    if (url.pathname.includes('/rest/v1/reports')) {
      const id = url.searchParams.get('id')?.replace('eq.', '')
      return route.fulfill({ json: id ? reports.find((report) => report.id === id) : reports })
    }
    if (url.pathname.includes('/storage/')) {
      if (url.pathname.endsWith('/missing.pdf'))
        return route.fulfill({
          status: 400,
          json: { statusCode: '404', error: 'not_found', message: 'Object not found' },
        })
      return route.fulfill({
        contentType: 'application/pdf',
        body: url.pathname.endsWith('/blank.pdf') ? blankBytes : original,
      })
    }
    return route.fulfill({ json: [] })
  })
  let adminLogins = 0
  await page.route('**/api/auth/admin-login', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ email: user.email, password: 'test-password-only' })
    adminLogins++
    return route.fulfill({ json: { access_token: token, refresh_token: 'test-refresh' } })
  })
  await page.goto('/admin')
  await expect(page.getByRole('tab')).toHaveCount(0)
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('test-password-only')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Toggle Sidebar' })).toBeVisible()
  expect(adminLogins).toBe(1)
  if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Toggle Sidebar' }).click()
  await page.getByRole('button', { name: 'Reports', exact: true }).click()
  if (testInfo.project.name === 'mobile') {
    // Close the sidebar after navigation if its modal overlay remains open.
    await page.keyboard.press('Escape')
  }
  const downloads: string[] = []
  page.on('download', (download) => downloads.push(download.suggestedFilename()))
  for (const kind of ['original', 'original', 'missing', 'blank', 'original']) {
    let button = page.getByRole('button', { name: `Download ${kind} patient`, exact: true })
    if (testInfo.project.name === 'mobile') {
      const details = page.locator('details').filter({ hasText: `${kind} patient` })
      if ((await details.getAttribute('open')) === null) await details.locator('summary').click()
      button = details.getByRole('button', { name: 'Download', exact: true })
    }
    if (kind !== 'original') {
      await button.click()
      await expect(page.getByRole('alert')).toContainText(
        kind === 'missing' ? 'missing from storage' : 'incomplete or damaged',
      )
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
  test.skip(
    !testInfo.config.configFile?.endsWith('playwright.archive.config.ts'),
    'Requires isolated mocked authentication server',
  )
  const user = {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'sales@example.test',
    aud: 'authenticated',
    role: 'authenticated',
  }
  const profile = {
    ...user,
    full_name: 'Sales Tester',
    role: 'SALES',
    status: 'active',
    requested_phone_e164: '+905551112233',
  }
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
    if (url.pathname.endsWith('/token'))
      return route.fulfill({
        json: { access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, user },
      })
    if (url.pathname.endsWith('/user')) return route.fulfill({ json: user })
    if (url.pathname.includes('/profiles'))
      return route.fulfill({ json: request.headers().accept?.includes('object') ? profile : [profile] })
    if (url.pathname.includes('/storage/')) {
      if (request.method() === 'POST') {
        const data = await new Response(request.postDataBuffer(), {
          headers: { 'content-type': request.headers()['content-type']! },
        }).formData()
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
        id: '00000000-0000-4000-8000-000000000010',
        created_by_employee_id: user.id,
        clinic_id: args.p_clinic_id,
        document_locale: args.p_document_locale,
        currency: args.p_currency,
        patient_name: args.p_patient_name,
        patient_phone: args.p_patient_phone,
        report_payload: args.p_report_payload,
        first_visit_total_minor: args.p_first_visit_total_minor,
        second_visit_total_minor: args.p_second_visit_total_minor,
        employee_name_snapshot: profile.full_name,
        employee_phone_snapshot: profile.requested_phone_e164,
        template_version: args.p_template_version,
        finalized_at: '2026-09-14T00:00:00Z',
        pdf_storage_key: args.p_pdf_storage_key,
        pdf_sha256: args.p_pdf_sha256,
      }
      return route.fulfill({ json: archived })
    }
    if (url.pathname.endsWith('/rpc/log_report_download')) {
      logged++
      return route.fulfill({ json: null })
    }
    if (url.pathname.endsWith('/reports'))
      return route.fulfill({ json: url.searchParams.has('id') ? archived : archived ? [archived] : [] })
    return route.fulfill({ json: [] })
  })
  // Sales staff sign in with their phone number alone (no password, no registration).
  await page.route('**/api/auth/employee-login', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ phone: '+905551112233' })
    return route.fulfill({ json: { access_token: token, refresh_token: 'test-refresh' } })
  })
  await page.goto('/')
  await page.getByLabel('Sales phone', { exact: true }).fill('+905551112233')
  await page.getByRole('button', { name: 'Sign in with phone', exact: true }).click()
  await page.getByRole('button', { name: 'Create Report', exact: true }).click()
  await page.getByRole('button', { name: /^Dr. Emir Aksu/ }).click()
  await page.getByLabel('Patient name', { exact: true }).fill('Saved Original')
  await page.getByLabel('Phone', { exact: true }).fill('+905551112233')
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt === 2) {
      await page.getByRole('button', { name: 'My Reports', exact: true }).click()
    }
    const downloadPromise = page.waitForEvent('download')
    await page
      .getByRole('button', { name: /Download/ })
      .filter({ visible: true })
      .click()
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

test('admin sign-in follows the chosen language and remembers it', async ({ page }, testInfo) => {
  test.skip(
    !testInfo.config.configFile?.endsWith('playwright.archive.config.ts'),
    'Requires isolated mocked authentication server',
  )
  await page.route('https://archive-tests.supabase.co/**', (route) => route.fulfill({ json: [] }))
  await page.goto('/admin')
  await page.getByRole('combobox').selectOption('ar')
  await expect(page.getByRole('heading', { name: 'عمليات طب الأسنان' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await page.getByRole('combobox').selectOption('fr')
  await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Se connecter', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Opérations dentaires' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
})

test('admin creates a sales employee directly, with no invitation email', async ({ page }, testInfo) => {
  test.skip(
    !testInfo.config.configFile?.endsWith('playwright.archive.config.ts'),
    'Requires isolated mocked authentication server',
  )
  const user = {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'archive@example.test',
    aud: 'authenticated',
    role: 'authenticated',
  }
  const profile = { ...user, full_name: 'Archive Tester', role: 'ADMIN', status: 'active' }
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`
  await page.route('https://archive-tests.supabase.co/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/token'))
      return route.fulfill({
        json: { access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, user },
      })
    if (url.pathname.endsWith('/user')) return route.fulfill({ json: user })
    if (url.pathname.includes('/profiles'))
      return route.fulfill({ json: route.request().headers().accept?.includes('object') ? profile : [profile] })
    return route.fulfill({ json: [] })
  })
  await page.route('**/api/auth/admin-login', (route) =>
    route.fulfill({ json: { access_token: token, refresh_token: 'test-refresh' } }),
  )
  const created: unknown[] = []
  await page.route('**/api/admin/create-employee', async (route) => {
    created.push(route.request().postDataJSON())
    return route.fulfill({ status: 201, json: { id: 'new-user' } })
  })
  await page.route('**/api/admin/invite-employee', () => {
    throw new Error('invitation endpoint must not be called')
  })
  await page.goto('/admin')
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('test-password-only')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Toggle Sidebar' }).click()
  await page.getByRole('button', { name: 'Employees', exact: true }).click()
  if (testInfo.project.name === 'mobile') await page.keyboard.press('Escape')
  await page.getByLabel('Full name', { exact: true }).fill('New Seller')
  await page.getByLabel('Work phone', { exact: true }).fill('+905559998877')
  await page.getByRole('button', { name: 'Create sales employee', exact: true }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'New Seller can now sign in with +905559998877.' }),
  ).toBeVisible()
  expect(created).toEqual([{ fullName: 'New Seller', email: '', workPhoneE164: '+905559998877' }])
})

test('admin views the archived PDF in-app, approves one report and rejects another with a note', async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.config.configFile?.endsWith('playwright.archive.config.ts'),
    'Requires isolated mocked authentication server',
  )
  const mobile = testInfo.project.name === 'mobile'
  const pdf = await PDFDocument.create()
  for (let i = 0; i < 5; i++) pdf.addPage().drawText(`Archived review page ${i + 1}`)
  const original = Buffer.from(await pdf.save())
  const user = {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'archive@example.test',
    aud: 'authenticated',
    role: 'authenticated',
  }
  const profile = { ...user, full_name: 'Review Manager', role: 'ADMIN', status: 'active' }
  const seller = {
    id: '00000000-0000-4000-8000-000000000002',
    email: 'seller@example.test',
    full_name: 'Seller One',
    role: 'SALES',
    status: 'active',
  }
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`
  const reports = ['Ada', 'Bora'].map((name, index) => ({
    id: `report-${index}`,
    created_by_employee_id: seller.id,
    clinic_id: 'aksu',
    document_locale: 'en',
    currency: 'EUR',
    patient_name: `${name} patient`,
    patient_phone: '+905551112233',
    finalized_at: '2026-10-10T09:00:00Z',
    employee_name_snapshot: seller.full_name,
    employee_phone_snapshot: '+905551112233',
    first_visit_total_minor: 12500,
    second_visit_total_minor: 0,
    parent_report_id: null,
    pdf_storage_key: `${seller.id}/${index}.pdf`,
    pdf_sha256: createHash('sha256').update(original).digest('hex'),
    report_payload: { clinicId: 'aksu', patient: { name: `${name} patient` }, firstVisit: { treatmentRows: [] } },
  }))
  // Server-side state: survives reloads like the real table does.
  const reviews: Record<string, unknown>[] = []
  const reviewCalls: Record<string, unknown>[] = []
  let logged = 0
  await page.route('https://archive-tests.supabase.co/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname.endsWith('/token'))
      return route.fulfill({
        json: { access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, user },
      })
    if (url.pathname.endsWith('/user')) return route.fulfill({ json: user })
    if (url.pathname.includes('/profiles'))
      return route.fulfill({ json: request.headers().accept?.includes('object') ? profile : [profile, seller] })
    if (url.pathname.endsWith('/rpc/review_report')) {
      const args = request.postDataJSON()
      reviewCalls.push(args)
      if (reviews.some((review) => review.report_id === args.p_report_id))
        return route.fulfill({ status: 400, json: { code: 'P0001', message: 'report_already_reviewed' } })
      const review = {
        id: `review-${reviews.length}`,
        report_id: args.p_report_id,
        report_pdf_sha256: reports[0]!.pdf_sha256,
        reviewer_id: user.id,
        previous_state: 'pending_review',
        decision: args.p_decision,
        note: args.p_note ?? null,
        created_at: '2026-10-11T12:00:00Z',
      }
      reviews.unshift(review)
      return route.fulfill({ json: review })
    }
    if (url.pathname.endsWith('/report_reviews')) return route.fulfill({ json: reviews })
    if (url.pathname.includes('/rpc/log_report_download')) {
      logged++
      return route.fulfill({ json: null })
    }
    if (url.pathname.endsWith('/reports')) {
      const id = url.searchParams.get('id')?.replace('eq.', '')
      return route.fulfill({ json: id ? reports.find((report) => report.id === id) : reports })
    }
    if (url.pathname.includes('/storage/')) return route.fulfill({ contentType: 'application/pdf', body: original })
    return route.fulfill({ json: [] })
  })
  await page.route('**/api/auth/admin-login', (route) =>
    route.fulfill({ json: { access_token: token, refresh_token: 'test-refresh' } }),
  )
  const openReports = async () => {
    if (mobile) await page.getByRole('button', { name: 'Toggle Sidebar' }).click()
    await page.getByRole('button', { name: 'Reports', exact: true }).click()
    if (mobile) await page.keyboard.press('Escape')
  }
  const openViewer = async (patient: string) => {
    if (mobile) {
      const details = page.locator('details').filter({ hasText: patient })
      if ((await details.getAttribute('open')) === null) await details.locator('summary').click()
      await details.getByRole('button', { name: 'View', exact: true }).click()
    } else {
      await page.getByRole('button', { name: `View PDF for ${patient}`, exact: true }).click()
    }
    const dialog = page.getByRole('dialog', { name: `Report for ${patient}` })
    await expect(dialog).toBeVisible()
    return dialog
  }

  await page.goto('/admin')
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('test-password-only')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Toggle Sidebar' })).toBeVisible()
  await openReports()

  // View renders every page of the archived file without downloading it or logging a download.
  const downloads: string[] = []
  page.on('download', (download) => downloads.push(download.suggestedFilename()))
  let dialog = await openViewer('Ada patient')
  await expect(dialog.locator('canvas')).toHaveCount(5)
  await expect(dialog.getByText('Pending review')).toBeVisible()
  await dialog.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(dialog.getByText('Approved by Review Manager on')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Done', exact: true })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(dialog).toBeHidden()

  // Reject needs a real note before it can be sent.
  dialog = await openViewer('Bora patient')
  await dialog.getByRole('button', { name: 'Reject', exact: true }).click()
  const submit = dialog.getByRole('button', { name: 'Reject report', exact: true })
  await expect(submit).toBeDisabled()
  const note = dialog.getByLabel('What needs to be corrected?', { exact: true })
  await note.fill('   short ')
  await expect(submit).toBeDisabled()
  await note.fill('Second visit implant count must be 4, not 2.')
  await submit.click()
  await expect(dialog.getByText('Rejected by Review Manager on')).toBeVisible()
  await expect(dialog.getByText('Second visit implant count must be 4, not 2.')).toBeVisible()
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()

  expect(reviewCalls).toEqual([
    { p_report_id: 'report-0', p_decision: 'approved' },
    { p_report_id: 'report-1', p_decision: 'rejected', p_note: 'Second visit implant count must be 4, not 2.' },
  ])
  expect(logged).toBe(0)
  expect(downloads).toEqual([])

  // The decision comes back from the server after a reload, and stays final.
  await page.reload()
  await openReports()
  await page.getByLabel('Review status', { exact: true }).selectOption('rejected')
  await expect(page.getByText('Ada patient')).toHaveCount(0)
  dialog = await openViewer('Bora patient')
  await expect(dialog.getByText('Second visit implant count must be 4, not 2.')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Reject', exact: true })).toHaveCount(0)
  expect(reviewCalls).toHaveLength(2)
})

test('an employee sees the manager decision and the rejection note on their reports', async ({ page }, testInfo) => {
  test.skip(
    !testInfo.config.configFile?.endsWith('playwright.archive.config.ts'),
    'Requires isolated mocked authentication server',
  )
  const user = {
    id: '00000000-0000-4000-8000-000000000002',
    email: 'seller@example.test',
    aud: 'authenticated',
    role: 'authenticated',
  }
  const profile = {
    ...user,
    full_name: 'Seller One',
    role: 'SALES',
    status: 'active',
    requested_phone_e164: '+905551112233',
  }
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`
  const reports = ['Ada', 'Bora', 'Cem'].map((name, index) => ({
    id: `report-${index}`,
    created_by_employee_id: user.id,
    clinic_id: 'aksu',
    document_locale: 'en',
    currency: 'EUR',
    patient_name: `${name} patient`,
    patient_phone: '+905551112233',
    finalized_at: `2026-10-0${index + 1}T09:00:00Z`,
    employee_name_snapshot: profile.full_name,
    employee_phone_snapshot: profile.requested_phone_e164,
    first_visit_total_minor: 12500,
    second_visit_total_minor: 0,
    parent_report_id: null,
    pdf_storage_key: `${user.id}/${index}.pdf`,
    pdf_sha256: '0'.repeat(64),
    report_payload: { clinicId: 'aksu', patient: { name: `${name} patient` }, firstVisit: { treatmentRows: [] } },
  }))
  const reviews = [
    { report_id: 'report-0', decision: 'approved', note: null },
    { report_id: 'report-1', decision: 'rejected', note: 'Add the missing panoramic X-ray.' },
  ].map((review, index) => ({
    ...review,
    id: `review-${index}`,
    report_pdf_sha256: '0'.repeat(64),
    reviewer_id: '00000000-0000-4000-8000-000000000001',
    previous_state: 'pending_review',
    created_at: '2026-10-11T12:00:00Z',
  }))
  let reviewAttempts = 0
  await page.route('https://archive-tests.supabase.co/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname.endsWith('/token'))
      return route.fulfill({
        json: { access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, user },
      })
    if (url.pathname.endsWith('/user')) return route.fulfill({ json: user })
    if (url.pathname.includes('/profiles'))
      return route.fulfill({ json: request.headers().accept?.includes('object') ? profile : [profile] })
    if (url.pathname.endsWith('/rpc/review_report')) {
      reviewAttempts++
      return route.fulfill({ status: 400, json: { message: 'admin_required' } })
    }
    if (url.pathname.endsWith('/report_reviews')) return route.fulfill({ json: reviews })
    if (url.pathname.endsWith('/reports')) return route.fulfill({ json: reports })
    return route.fulfill({ json: [] })
  })
  await page.route('**/api/auth/employee-login', (route) =>
    route.fulfill({ json: { access_token: token, refresh_token: 'test-refresh' } }),
  )
  await page.goto('/')
  await page.getByLabel('Sales phone', { exact: true }).fill('+905551112233')
  await page.getByRole('button', { name: 'Sign in with phone', exact: true }).click()
  await page.getByRole('button', { name: 'My Reports', exact: true }).click()

  const item = (patient: string) => page.getByRole('listitem').filter({ hasText: patient })
  await expect(item('Ada patient').getByText('Approved', { exact: true })).toBeVisible()
  await expect(item('Ada patient').getByText(/^Approved on /)).toBeVisible()
  await expect(item('Cem patient').getByText('Pending review', { exact: true })).toBeVisible()
  const rejection = item('Bora patient').getByRole('region', { name: 'Changes requested' })
  await expect(rejection).toContainText('Add the missing panoramic X-ray.')
  await expect(rejection).toContainText('Reviewed on')
  await expect(rejection.getByRole('button', { name: 'Correct and resubmit', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Done', exact: true })).toHaveCount(0)
  expect(reviewAttempts).toBe(0)
})
