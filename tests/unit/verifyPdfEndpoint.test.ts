// @vitest-environment node
import { PDFDocument } from 'pdf-lib'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn(), download: vi.fn(), upsert: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({
  auth: { getUser: mocks.getUser },
  from: (table: string) => table === 'profiles'
    ? { select: () => ({ eq: () => ({ single: mocks.profile }) }) }
    : { upsert: mocks.upsert },
  storage: { from: () => ({ download: mocks.download }) },
}) }))
import handler from '../../api/reports/verify-pdf'

describe('PDF verification endpoint', () => {
  const userId = '00000000-0000-4000-8000-000000000001'
  const req = { method: 'POST', headers: { authorization: 'Bearer test' }, body: { storageKey: `${userId}/00000000-0000-4000-8000-000000000002.pdf` } }
  const response = () => { const res = { status: vi.fn(), json: vi.fn() }; res.status.mockReturnValue(res); return res }
  beforeEach(() => {
    vi.clearAllMocks()
    for (const name of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) vi.stubEnv(name, 'test')
    mocks.getUser.mockResolvedValue({ data: { user: { id: userId } } })
    mocks.profile.mockResolvedValue({ data: { status: 'active' } })
    mocks.upsert.mockResolvedValue({ error: null })
  })
  it.each(['blank', 'malformed'])('does not bless a %s PDF with a checksum', async (kind) => {
    const pdf = await PDFDocument.create(); pdf.addPage([200, 200])
    const bytes = kind === 'blank' ? await pdf.save() : new Uint8Array([1, 2, 3])
    mocks.download.mockResolvedValue({ data: new Blob([Uint8Array.from(bytes)]) })
    const res = response(); await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(422)
    expect(mocks.upsert).not.toHaveBeenCalled()
  })
  it('verifies populated five-page PDFs', async () => {
    const pdf = await PDFDocument.create()
    for (let i = 0; i < 5; i++) pdf.addPage().drawText('Treatment report')
    mocks.download.mockResolvedValue({ data: new Blob([Uint8Array.from(await pdf.save())]) })
    const res = response(); await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ storage_key: req.body.storageKey, pdf_sha256: expect.stringMatching(/^[0-9a-f]{64}$/) }))
  })
  it('rejects suspended accounts before accessing storage', async () => {
    mocks.profile.mockResolvedValue({ data: { status: 'suspended' } })
    const res = response(); await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(mocks.download).not.toHaveBeenCalled()
  })
})
