// @vitest-environment node
import { createHash } from 'node:crypto'
import { PDFDocument } from 'pdf-lib'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { assertArchivedPdf } from '../../src/lib/pdfIntegrity'

const mocks = vi.hoisted(() => ({
  single: vi.fn(), storageDownload: vi.fn(), rpc: vi.fn(), upload: vi.fn(),
}))
vi.mock('../../src/lib/supabase', () => ({ requireSupabase: () => ({
  from: () => ({ select: () => ({ eq: () => ({ single: mocks.single }) }) }),
  storage: { from: () => ({ download: mocks.storageDownload, upload: mocks.upload }) },
  rpc: mocks.rpc,
}) }))
import { downloadArchivedReport, finalizeReport, type ArchivedReport } from '../../src/lib/operations'

async function populatedPdf() {
  const pdf = await PDFDocument.create()
  for (let i = 0; i < 5; i++) pdf.addPage().drawText(`Treatment page ${i + 1}`)
  return pdf.save()
}

describe('archived PDF downloads', () => {
  let bytes: Uint8Array
  let report: ArchivedReport
  beforeEach(async () => {
    vi.clearAllMocks()
    bytes = await populatedPdf()
    report = { id: 'report-id', pdf_storage_key: 'owner/original.pdf', pdf_sha256: createHash('sha256').update(bytes).digest('hex') } as ArchivedReport
    mocks.single.mockResolvedValue({ data: report, error: null })
    mocks.storageDownload.mockResolvedValue({ data: new Blob([Uint8Array.from(bytes)]), error: null })
    mocks.rpc.mockResolvedValue({ error: null })
  })
  it('re-downloads the exact original bytes repeatedly and logs each download', async () => {
    for (let i = 0; i < 2; i++) {
      const result = await downloadArchivedReport(report)
      expect(new Uint8Array(await result.arrayBuffer())).toEqual(bytes)
    }
    expect(mocks.rpc).toHaveBeenCalledTimes(2)
  })
  it('uses a fresh authorized snapshot and reports a missing original', async () => {
    mocks.storageDownload.mockResolvedValue({ data: null, error: { statusCode: '404', message: 'Object not found' } })
    await expect(downloadArchivedReport({ ...report, pdf_storage_key: 'untrusted/changed.pdf' })).rejects.toThrow('missing from storage')
    expect(mocks.storageDownload).toHaveBeenCalledWith(report.pdf_storage_key)
  })
  it('rejects blank legacy PDFs instead of downloading an empty page', async () => {
    const blank = await PDFDocument.create(); blank.addPage([200, 200])
    mocks.storageDownload.mockResolvedValue({ data: new Blob([Uint8Array.from(await blank.save())]), error: null })
    await expect(downloadArchivedReport(report)).rejects.toThrow('incomplete or damaged')
  })
  it('does not present a checksum-mismatched PDF as an original', async () => {
    report.pdf_sha256 = '0'.repeat(64)
    await expect(downloadArchivedReport(report)).rejects.toThrow('checksum')
  })
  it('denies stale access before reading storage', async () => {
    mocks.single.mockResolvedValue({ data: null, error: { message: 'Access denied' } })
    await expect(downloadArchivedReport(report)).rejects.toThrow('permission')
    expect(mocks.storageDownload).not.toHaveBeenCalled()
  })
  it.each(['403', '500'])('does not mask storage permission/service failure %s', async (statusCode) => {
    mocks.storageDownload.mockResolvedValue({ data: null, error: { statusCode, message: 'Storage unavailable' } })
    await expect(downloadArchivedReport(report)).rejects.toThrow('Storage unavailable')
  })
  it('still enforces authorization at download logging time', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'active account required' } })
    await expect(downloadArchivedReport(report)).rejects.toThrow('active account required')
  })
  it('rejects blank and malformed uploads before storing anything', async () => {
    await expect(assertArchivedPdf(new Uint8Array([1, 2, 3]))).rejects.toThrow('five-page')
    const blank = await PDFDocument.create()
    for (let i = 0; i < 5; i++) blank.addPage()
    await expect(finalizeReport({} as never, await blank.save(), {} as never)).rejects.toThrow('five-page')
    expect(mocks.upload).not.toHaveBeenCalled()
    await expect(assertArchivedPdf(bytes)).resolves.toBeUndefined()
  })
})
