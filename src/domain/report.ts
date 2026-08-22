import { z } from 'zod'

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

export type Locale = (typeof locales)[number]
export type Currency = (typeof currencies)[number]
export type AssessmentKey = (typeof assessmentKeys)[number]

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

export const reportSchema = z.object({
  patient: z.object({
    reportDate: z.string().min(1, 'validation.required'),
    name: z.string().trim().min(1, 'validation.required').max(120),
    age: z.coerce.number().int().min(0).max(120),
    phone: z.string().trim().min(6).max(30),
  }),
  document: z.object({
    locale: z.enum(locales),
    currency: z.enum(currencies),
  }),
  assessment: z.object(Object.fromEntries(assessmentKeys.map((key) => [key, z.boolean()])) as Record<AssessmentKey, z.ZodBoolean>),
  firstVisit: z.object({
    treatmentRows: z.array(treatmentRowSchema).max(7),
    discountEnabled: z.boolean(),
    discountMode: z.enum(['manual_final_price', 'percentage']),
    discountPercentage: moneyInput.pipe(z.number().min(0).max(100)).optional(),
    discountedFinalPrice: moneyInput.pipe(z.number().min(0).max(10_000_000)).optional(),
    discountExpiryDate: z.string().optional(),
  }).superRefine((visit, ctx) => {
    if (!visit.discountEnabled) return
    if (!visit.discountExpiryDate) ctx.addIssue({ code: 'custom', path: ['discountExpiryDate'], message: 'validation.required' })
    if (visit.discountMode === 'manual_final_price' && visit.discountedFinalPrice === undefined) {
      ctx.addIssue({ code: 'custom', path: ['discountedFinalPrice'], message: 'validation.required' })
    }
    if (visit.discountMode === 'percentage' && visit.discountPercentage === undefined) {
      ctx.addIssue({ code: 'custom', path: ['discountPercentage'], message: 'validation.required' })
    }
  }),
  secondVisit: z.object({ treatmentRows: z.array(treatmentRowSchema).max(7) }),
})

export type TreatmentRow = z.infer<typeof treatmentRowSchema>
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

export function createDefaultReport(): ReportData {
  return {
    patient: { reportDate: new Date().toISOString().slice(0, 10), name: '', age: 34, phone: '' },
    document: { locale: 'en', currency: 'GBP' },
    assessment: Object.fromEntries(assessmentKeys.map((key) => [key, false])) as Record<AssessmentKey, boolean>,
    firstVisit: {
      treatmentRows: [
        row('fv-1', 'gingivectomy', { quantity: 1, unitPrice: 215 }),
        row('fv-2', 'emaxVeneers', { quality: 'Ivoclar - German', quantity: 20, unitPrice: 171 }),
        row('fv-3', 'zirconiumCrowns', { quality: 'Ivoclar - German', quantity: 2, unitPrice: 100 }),
        row('fv-4', 'nightGuard'),
        row('fv-5', 'gumTreatment', { quantity: 1, unitPrice: 129 }),
        row('fv-6', 'rootCanals', { quantity: 2, unitPrice: 65 }),
        row('fv-7', 'hotelVipTransfer', { quality: '4 Stars', included: true, duration: '7 nights / 8 days' }),
      ],
      discountEnabled: true,
      discountMode: 'manual_final_price',
      discountedFinalPrice: 3774,
      discountPercentage: 0,
      discountExpiryDate: '',
    },
    secondVisit: {
      treatmentRows: [
        row('sv-1', 'gumTreatment'), row('sv-2', 'zirconiumCrown'), row('sv-3', 'emaxVeneer'),
        row('sv-4', 'emaxCrown'), row('sv-5', 'rootCanalTreatment'), row('sv-6', 'rootCanalRetreatment'),
        row('sv-7', 'hotelVipTransfer'),
      ],
    },
  }
}
