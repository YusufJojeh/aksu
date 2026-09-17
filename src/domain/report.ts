import { z } from 'zod'
import type { ClinicId } from '../clinics/types'

export const locales = ['en', 'ar', 'fr', 'tr', 'de', 'es', 'ru', 'pl', 'it'] as const
export const currencies = ['GBP', 'EUR', 'USD', 'TRY'] as const
export const assessmentKeys = [
  'existingDentalImplants',
  'existingDentalRestorations',
  'teethRelativelyAligned',
  'gingivalInflammation',
  'dentalCaries',
  'malocclusion',
  'toothWear',
  'missingTeeth',
  'dentalAbscesses',
  'gingivalRecession',
  'dentalCrowding',
  'boneResorption',
] as const

// "Current Dental Condition" checkboxes, page 2 of the MB Dental template (all 4 locales).
export const mbConditionKeys = [
  'missingTeeth',
  'looseTeeth',
  'gumInfectionOrDisease',
  'crowdedOrCrookedTeeth',
  'toothDecayOrBrokenTeeth',
  'teethGrindingOrClenching',
  'biteOrJawProblems',
  'aestheticToothDefects',
] as const

// "Recommended Treatments" checkboxes, page 2 of the MB Dental template (all 4 locales).
export const mbRecommendedTreatmentKeys = [
  'dentalExtractions',
  'dentalImplants',
  'dentalFillings',
  'zirconiaCrowns',
  'emaxVeneers',
  'boneGrafting',
  'sinusLift',
  'deepCleaning',
  'rootCanalTreatment',
] as const

export type Locale = (typeof locales)[number]
export type Currency = (typeof currencies)[number]
export type AssessmentKey = (typeof assessmentKeys)[number]
export type MbConditionKey = (typeof mbConditionKeys)[number]
export type MbRecommendedTreatmentKey = (typeof mbRecommendedTreatmentKeys)[number]

const moneyInput = z.union([z.number(), z.string()]).transform((value) => {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
})

export const treatmentRowSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean(),
  treatmentKey: z.string().optional(),
  customTreatment: z.string().max(80).optional(),
  quality: z.string().max(60),
  quantity: moneyInput.pipe(z.number().min(0).max(999)),
  unitPrice: moneyInput.pipe(z.number().min(0).max(10_000_000)),
  included: z.boolean(),
  duration: z.string().max(40).optional(),
})

// Both visits carry the same optional discount block — see `finalTotalMinor`/`visitFinalTotalMinor`
// in calculations.ts and the matching PDF box pair (`discount`/`secondDiscount`) per Aksu template.
const visitDiscountFields = {
  discountEnabled: z.boolean(),
  discountMode: z.enum(['manual_final_price', 'percentage']),
  discountPercentage: moneyInput.pipe(z.number().min(0).max(100)).optional(),
  discountedFinalPrice: moneyInput.pipe(z.number().min(0).max(10_000_000)).optional(),
  discountExpiryDate: z.string().optional(),
}

const aksuReportObjectSchema = z.object({
  clinicId: z.literal('aksu'),
  patient: z.object({
    reportDate: z.string().min(1, 'validation.required'),
    name: z.string().trim().min(1, 'validation.required').max(120),
    age: z.coerce.number().int().min(0, 'validation.invalid').max(120, 'validation.invalid'),
    phone: z.string().trim().min(6, 'validation.invalid').max(30, 'validation.invalid'),
  }),
  document: z.object({
    locale: z.enum(locales),
    currency: z.enum(currencies),
  }),
  assessment: z.object(Object.fromEntries(assessmentKeys.map((key) => [key, z.boolean()])) as Record<AssessmentKey, z.ZodBoolean>),
  firstVisit: z.object({ treatmentRows: z.array(treatmentRowSchema).max(7), ...visitDiscountFields }),
  secondVisit: z.object({ treatmentRows: z.array(treatmentRowSchema).max(7), ...visitDiscountFields }),
})

// MB's 5 supported document locales (evidence: only EN/FR/DE/ES/AR template PDFs exist) — a strict
// subset of the app-wide `locales`, so an MB report can never carry a locale MB has no artwork for.
const mbDocumentLocales = ['en', 'fr', 'de', 'es', 'ar'] as const

const mbReportObjectSchema = z.object({
  clinicId: z.literal('mb-dental'),
  patient: z.object({
    reportDate: z.string().min(1, 'validation.required'),
    name: z.string().trim().min(1, 'validation.required').max(120),
    age: z.coerce.number().int().min(0, 'validation.invalid').max(120, 'validation.invalid'),
    phone: z.string().trim().min(6, 'validation.invalid').max(30, 'validation.invalid'),
    patientId: z.string().trim().min(1, 'validation.required').max(60),
  }),
  document: z.object({
    locale: z.enum(mbDocumentLocales),
    currency: z.enum(currencies),
  }),
  oralHealth: z.object({
    currentCondition: z.object(Object.fromEntries(mbConditionKeys.map((key) => [key, z.boolean()])) as Record<MbConditionKey, z.ZodBoolean>),
    recommendedTreatments: z.object(Object.fromEntries(mbRecommendedTreatmentKeys.map((key) => [key, z.boolean()])) as Record<MbRecommendedTreatmentKey, z.ZodBoolean>),
  }),
  // MB's template has no discount concept (evidence: no discount row on the Treatment Plan page).
  firstVisit: z.object({ treatmentRows: z.array(treatmentRowSchema).max(6) }),
  secondVisit: z.object({ treatmentRows: z.array(treatmentRowSchema).max(6) }),
})

const reportObjectSchema = z.discriminatedUnion('clinicId', [aksuReportObjectSchema, mbReportObjectSchema])

// Gates the Download action: every field a publishable document requires must be present.
export const reportSchema = reportObjectSchema.superRefine((report, ctx) => {
  if (report.clinicId !== 'aksu') return
  for (const key of ['firstVisit', 'secondVisit'] as const) {
    const visit = report[key]
    if (!visit.discountEnabled) continue
    if (report.document.locale !== 'ar' && !visit.discountExpiryDate) {
      ctx.addIssue({ code: 'custom', path: [key, 'discountExpiryDate'], message: 'validation.required' })
    }
    if (visit.discountMode === 'manual_final_price' && visit.discountedFinalPrice === undefined) {
      ctx.addIssue({ code: 'custom', path: [key, 'discountedFinalPrice'], message: 'validation.required' })
    }
    if (visit.discountMode === 'percentage' && visit.discountPercentage === undefined) {
      ctx.addIssue({ code: 'custom', path: [key, 'discountPercentage'], message: 'validation.required' })
    }
  }
})

// Gates nothing: used to render a live preview from incomplete, in-progress form data.
// Fields a publishable document requires (name, phone, ...) fall back to blank/zero
// instead of failing, so the preview always has something to show, even on an empty form.
const draftPatientBase = {
  reportDate: z.string().catch(''),
  name: z.string().trim().max(120).catch(''),
  age: z.coerce.number().int().min(0).max(120).catch(0),
  phone: z.string().trim().max(30).catch(''),
}

const aksuDraftObjectSchema = aksuReportObjectSchema.extend({
  patient: z.object(draftPatientBase),
})

const mbDraftObjectSchema = mbReportObjectSchema.extend({
  patient: z.object({ ...draftPatientBase, patientId: z.string().trim().max(60).catch('') }),
})

export const draftReportSchema = z.discriminatedUnion('clinicId', [aksuDraftObjectSchema, mbDraftObjectSchema])

export type TreatmentRow = z.infer<typeof treatmentRowSchema>
export type AksuReportData = z.infer<typeof aksuReportObjectSchema>
export type MbReportData = z.infer<typeof mbReportObjectSchema>
export type ReportData = z.infer<typeof reportSchema>

const row = (id: string, treatmentKey: string, overrides: Partial<TreatmentRow> = {}): TreatmentRow => ({
  id,
  enabled: true,
  treatmentKey,
  customTreatment: '',
  quality: '',
  quantity: 0,
  unitPrice: 0,
  included: false,
  duration: '',
  ...overrides,
})

// MB ships with blank rows — no source evidence for a fixed MB treatment-menu catalog like Aksu's.
// Staff use the same free-text `customTreatment` field Aksu's blank/ad-hoc rows already rely on.
const blankRow = (id: string): TreatmentRow => ({
  id, enabled: true, treatmentKey: undefined, customTreatment: '', quality: '', quantity: 0, unitPrice: 0, included: false, duration: '',
})

export function createDefaultAksuReport(): AksuReportData {
  return {
    clinicId: 'aksu',
    patient: { reportDate: new Date().toISOString().slice(0, 10), name: '', age: 0, phone: '' },
    document: { locale: 'en', currency: 'GBP' },
    assessment: Object.fromEntries(assessmentKeys.map((key) => [key, false])) as Record<AssessmentKey, boolean>,
    firstVisit: {
      treatmentRows: [
        row('fv-1', 'gingivectomy'),
        row('fv-2', 'emaxVeneers'),
        row('fv-3', 'zirconiumCrowns'),
        row('fv-4', 'nightGuard'),
        row('fv-5', 'gumTreatment'),
        row('fv-6', 'rootCanals'),
        row('fv-7', 'hotelVipTransfer'),
      ],
      discountEnabled: false,
      discountMode: 'manual_final_price',
      discountedFinalPrice: 0,
      discountPercentage: 0,
      discountExpiryDate: '',
    },
    secondVisit: {
      treatmentRows: [
        row('sv-1', 'gumTreatment'), row('sv-2', 'zirconiumCrown'), row('sv-3', 'emaxVeneer'),
        row('sv-4', 'emaxCrown'), row('sv-5', 'rootCanalTreatment'), row('sv-6', 'rootCanalRetreatment'),
        row('sv-7', 'hotelVipTransfer'),
      ],
      discountEnabled: false,
      discountMode: 'manual_final_price',
      discountedFinalPrice: 0,
      discountPercentage: 0,
      discountExpiryDate: '',
    },
  }
}

export function createDefaultMbReport(): MbReportData {
  return {
    clinicId: 'mb-dental',
    patient: { reportDate: new Date().toISOString().slice(0, 10), name: '', age: 0, phone: '', patientId: '' },
    document: { locale: 'en', currency: 'EUR' },
    oralHealth: {
      currentCondition: Object.fromEntries(mbConditionKeys.map((key) => [key, false])) as Record<MbConditionKey, boolean>,
      recommendedTreatments: Object.fromEntries(mbRecommendedTreatmentKeys.map((key) => [key, false])) as Record<MbRecommendedTreatmentKey, boolean>,
    },
    firstVisit: { treatmentRows: ['fv-1', 'fv-2', 'fv-3', 'fv-4', 'fv-5', 'fv-6'].map(blankRow) },
    secondVisit: { treatmentRows: ['sv-1', 'sv-2', 'sv-3', 'sv-4', 'sv-5', 'sv-6'].map(blankRow) },
  }
}

export function createDefaultReport(clinicId: 'aksu'): AksuReportData
export function createDefaultReport(clinicId: 'mb-dental'): MbReportData
export function createDefaultReport(clinicId: ClinicId): ReportData
export function createDefaultReport(clinicId: ClinicId): ReportData {
  return clinicId === 'aksu' ? createDefaultAksuReport() : createDefaultMbReport()
}
