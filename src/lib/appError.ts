// User-facing failures carry a stable code; the UI translates `errors.<code>` (src/i18n/errorText.ts).
// The English message stays on the Error for logs and tests.
export const APP_ERROR_CODES = [
  'session_expired',
  'request_failed',
  'verify_failed',
  'invalid_phone',
  'invalid_email',
  'name_required',
  'sign_in_failed',
  'invalid_credentials',
  'employee_not_found',
  'auth_not_configured',
  'admin_required',
  'active_account_required',
  'report_unavailable',
  'report_pdf_missing',
  'report_pdf_damaged',
  'report_checksum_mismatch',
  'archive_empty',
  'finalize_failed',
  'document_unavailable',
  'document_checksum_mismatch',
  'sales_profile_inactive',
  'invalid_sales_identity',
  'pdf_too_large',
  'invalid_parent_report',
  'parent_report_not_found',
  'pdf_incomplete',
  'not_found',
  'cannot_delete_self',
  'cannot_delete_admin',
  'employee_has_history',
  'delete_failed',
  'profile_deleted_auth_delete_failed',
  'email_already_registered',
  'phone_already_registered',
  'create_failed',
] as const

export type AppErrorCode = (typeof APP_ERROR_CODES)[number]

// Endpoint codes that only matter internally, folded into what the user can act on.
const CODE_ALIASES: Record<string, AppErrorCode> = {
  unauthorized: 'session_expired',
  method_not_allowed: 'request_failed',
  invalid_body: 'request_failed',
  invalid_storage_key: 'verify_failed',
  invalid_document_kind: 'verify_failed',
  object_not_found: 'verify_failed',
  checksum_write_failed: 'verify_failed',
}

export function toAppErrorCode(value: unknown): AppErrorCode | undefined {
  if (typeof value !== 'string') return undefined
  if ((APP_ERROR_CODES as readonly string[]).includes(value)) return value as AppErrorCode
  return CODE_ALIASES[value]
}

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/** Builds an AppError from one of our endpoints' `{ error, code? }` JSON bodies. */
export function errorFromBody(
  payload: { error?: string; code?: string },
  fallbackCode: AppErrorCode,
  fallbackMessage: string,
): AppError {
  const code = toAppErrorCode(payload.code) ?? toAppErrorCode(payload.error) ?? fallbackCode
  return new AppError(code, payload.error ?? fallbackMessage)
}
