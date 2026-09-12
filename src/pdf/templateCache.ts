import type { ClinicId } from '../clinics/types'
import type { Locale } from '../domain/report'
import { resolveTemplate, type ResolvedTemplate } from './profiles/resolve'

const templateRequests = new Map<string, Promise<ArrayBuffer>>()
let arabicFontRequest: Promise<ArrayBuffer | undefined> | undefined

/** Cache key is `${clinicId}:${locale}` so two clinics sharing a locale never collide. */
export async function loadTemplateBytes(clinicId: ClinicId, locale: Locale): Promise<{ bytes: ArrayBuffer; resolved: ResolvedTemplate }> {
  const resolved = resolveTemplate(clinicId, locale)
  const cacheKey = `${clinicId}:${resolved.usedTemplate}`
  let request = templateRequests.get(cacheKey)
  if (!request) {
    request = fetch(`./templates/${clinicId}/${resolved.usedTemplate}.pdf`).then((response) => {
      if (!response.ok) throw new Error(`Could not load PDF template: ${response.status}`)
      return response.arrayBuffer()
    }).catch((error) => {
      templateRequests.delete(cacheKey)
      throw error
    })
    templateRequests.set(cacheKey, request)
  }
  return { bytes: await request, resolved }
}

export async function loadArabicFont(): Promise<ArrayBuffer | undefined> {
  arabicFontRequest ??= fetch('./fonts/NotoSansArabic-Regular.woff')
    .then((response) => response.ok ? response.arrayBuffer() : undefined)
    .catch((error) => {
      arabicFontRequest = undefined
      throw error
    })
  return arabicFontRequest
}
