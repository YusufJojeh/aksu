import { useTranslation } from 'react-i18next'
import type { ReviewState } from '../lib/operations'

const tone: Record<ReviewState, string> = {
  pending_review: 'border-amber-300 bg-amber-50 text-amber-900',
  approved: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  rejected: 'border-red-300 bg-red-50 text-red-900',
}

export function ReviewBadge({ state }: { state: ReviewState }) {
  const { t } = useTranslation()
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone[state]}`}>
      {t(`review.state.${state}`)}
    </span>
  )
}
