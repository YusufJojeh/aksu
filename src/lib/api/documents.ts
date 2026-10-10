import type { EmployeeProfile } from '../../auth/types'
import type { MbDocumentData } from '../../pdf/documents/mbDocuments'
import { AppError } from '../appError'
import { requireSupabase } from '../supabase'
import { fromRow, sha256Hex, toJson, verifyUploadedPdf } from './shared'

export interface ArchivedDocument {
  id: string
  created_by_employee_id: string
  kind: 'warranty' | 'invitation'
  patient_name: string
  payload: MbDocumentData
  pdf_storage_key: string
  pdf_sha256: string
  created_at: string
}

/** Saves a generated warranty/invitation PDF and its inputs to the employee's archive. */
export async function archiveDocument(document: MbDocumentData, bytes: Uint8Array, profile: EmployeeProfile): Promise<ArchivedDocument> {
  const client = requireSupabase()
  const id = crypto.randomUUID()
  const storageKey = `${profile.id}/documents/${id}.pdf`
  const blob = new Blob([Uint8Array.from(bytes)], { type: 'application/pdf' })
  const upload = await client.storage.from('report-pdfs').upload(storageKey, blob, { contentType: 'application/pdf', upsert: false })
  if (upload.error) throw upload.error
  let hash: string
  try {
    hash = await verifyUploadedPdf(storageKey, document.kind)
  } catch (error) {
    await client.storage.from('report-pdfs').remove([storageKey])
    throw error
  }
  const result = await client.from('employee_documents').insert({
    id,
    created_by_employee_id: profile.id,
    kind: document.kind,
    patient_name: document.data.patientName.trim().slice(0, 120),
    payload: toJson(document),
    pdf_storage_key: storageKey,
    pdf_sha256: hash,
  }).select('*').single()
  if (result.error) {
    await client.storage.from('report-pdfs').remove([storageKey])
    throw result.error
  }
  return fromRow<ArchivedDocument>(result.data)
}

export async function listDocuments(): Promise<ArchivedDocument[]> {
  const { data, error } = await requireSupabase().from('employee_documents').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data.map(fromRow<ArchivedDocument>)
}

export async function downloadArchivedDocument(document: ArchivedDocument): Promise<Blob> {
  const result = await requireSupabase().storage.from('report-pdfs').download(document.pdf_storage_key)
  if (result.error || !result.data) throw new AppError('document_unavailable', 'The archived document is unavailable or missing from storage.')
  const bytes = new Uint8Array(await result.data.arrayBuffer())
  if (await sha256Hex(bytes) !== document.pdf_sha256.toLowerCase()) {
    throw new AppError('document_checksum_mismatch', 'The archived document does not match its saved checksum. Download stopped to protect integrity.')
  }
  return result.data
}
