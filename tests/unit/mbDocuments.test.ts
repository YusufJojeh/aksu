import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { describe, expect, it } from 'vitest'
import {
  formatDocumentDate,
  mbDocumentFilename,
  renderMbDocument,
  suggestCertificateNo,
  unsupportedFields,
  type InvitationData,
  type MbDocumentData,
  type WarrantyData,
} from '../../src/pdf/documents/mbDocuments'

const read = async (file: string) => new Uint8Array(await readFile(path.join(process.cwd(), file)))
const assets = async (kind: 'warranty' | 'invitation') => ({
  template: await read(`public/templates/mb-dental/documents/${kind}.pdf`),
  fallbackFonts: await Promise.all(
    ['GeistLatin', 'GeistLatinExt', 'GeistCyrillic'].map((name) => read(`public/fonts/${name}.woff2`)),
  ),
})

async function pageTexts(bytes: Uint8Array): Promise<string[]> {
  const pdf = await getDocument({ data: bytes.slice() }).promise
  const texts: string[] = []
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const content = await (await pdf.getPage(pageNumber)).getTextContent()
    texts.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '))
  }
  return texts
}

const warranty: WarrantyData = {
  patientName: 'Şükrü Yılmaz',
  treatmentDate: '2026-10-02',
  certificateNo: 'MB-2026-10021234',
  treatmentPerformed:
    '8 zirconium crowns (upper arch), 2 dental implants with abutments and a full mouth hygiene treatment',
  issueDate: '2026-10-09',
}
const invitation: InvitationData = {
  letterDate: '2026-10-09',
  patientName: 'Jean Dupont',
  passportNumber: '19AB12345',
  nationality: 'French',
  treatmentPlan: 'Full mouth rehabilitation: 4 implants, 20 zirconium crowns and a bone graft in two visits',
  arrivalDate: '2026-11-03',
  startDate: '2026-11-04',
  completionDate: '2026-11-12',
  phone: '+90 555 111 22 33',
  email: 'info@example.test',
  website: 'www.example.test',
}

describe('MB fill-in documents', () => {
  it('formats dates like the printed placeholder', () => {
    expect(formatDocumentDate('2026-10-09')).toBe('09 / 10 / 2026')
    expect(formatDocumentDate('')).toBe('')
  })

  it('suggests a certificate number in the printed MB-<year>- shape', () => {
    expect(suggestCertificateNo(new Date(2026, 9, 9, 12))).toMatch(/^MB-2026-1009\d{4}$/)
  })

  it('flags Arabic-script values the English documents cannot print', () => {
    expect(unsupportedFields({ kind: 'invitation', data: { ...invitation, patientName: 'أحمد' } })).toEqual([
      'patientName',
    ])
    expect(unsupportedFields({ kind: 'warranty', data: warranty })).toEqual([])
  })

  it('fills the warranty certificate on both pages, including Turkish letters', async () => {
    const bytes = await renderMbDocument({ kind: 'warranty', data: warranty }, await assets('warranty'))
    const [first, second] = await pageTexts(bytes)
    // Letters outside WinAnsi are drawn as separate fallback-font runs, so compare without spaces.
    expect(first!.replace(/\s/g, '')).toContain('ŞükrüYılmaz')
    expect(first).toContain('02 / 10 / 2026')
    expect(first).toContain('MB-2026-10021234')
    expect(first).toContain('zirconium crowns')
    expect(second).toContain('09 / 10 / 2026')
    if (process.env.MB_DOC_OUT) await writeFile(path.join(process.env.MB_DOC_OUT, 'warranty-filled.pdf'), bytes)
  })

  it('fills the invitation letter', async () => {
    const bytes = await renderMbDocument({ kind: 'invitation', data: invitation }, await assets('invitation'))
    const [text] = await pageTexts(bytes)
    for (const value of [
      'Jean Dupont',
      '19AB12345',
      'French',
      '03 / 11 / 2026',
      '12 / 11 / 2026',
      '+90 555 111 22 33',
      'info@example.test',
      'www.example.test',
      'bone graft',
    ])
      expect(text).toContain(value)
    if (process.env.MB_DOC_OUT) await writeFile(path.join(process.env.MB_DOC_OUT, 'invitation-filled.pdf'), bytes)
  })

  it('keeps the printed placeholder when a field is left empty', async () => {
    const empty: MbDocumentData = { kind: 'invitation', data: { ...invitation, passportNumber: '' } }
    const [text] = await pageTexts(await renderMbDocument(empty, await assets('invitation')))
    expect(text).toMatch(/Passport Number:\s*_{5,}/)
  })

  it('names downloads after the patient', () => {
    expect(mbDocumentFilename({ kind: 'warranty', data: warranty })).toBe('MB-Warranty-Certificate-Şükrü-Yılmaz.pdf')
    expect(mbDocumentFilename({ kind: 'invitation', data: { ...invitation, patientName: ' ' } })).toBe(
      'MB-Medical-Invitation-Patient.pdf',
    )
  })
})
