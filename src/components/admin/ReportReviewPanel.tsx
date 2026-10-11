import { Check, Download, LoaderCircle, X } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { errorText } from '../../i18n/errorText'
import {
  REVIEW_NOTE_MAX,
  REVIEW_NOTE_MIN,
  reviewReport,
  type ArchivedReport,
  type ReportReview,
  type ReviewDecision,
} from '../../lib/operations'
import { reviewStateOf } from '../../lib/reportReview'
import { Button } from '../ui'
import { ReviewBadge } from '../ReviewBadge'

/** Done / Reject for one report. The decision is final once the server confirms it. */
export function ReportReviewPanel({
  report,
  review,
  reviewerName,
  corrections,
  isOwnReport,
  when,
  downloading,
  onDownload,
  onReviewed,
}: {
  report: ArchivedReport
  review?: ReportReview
  reviewerName?: string
  corrections: ArchivedReport[]
  isOwnReport: boolean
  when: (value: string) => string
  downloading: boolean
  onDownload: () => void
  onReviewed: (review: ReportReview) => void
}) {
  const { t } = useTranslation()
  const noteId = useId()
  const hintId = useId()
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState<ReviewDecision>()
  const [error, setError] = useState<string>()
  const state = reviewStateOf(review)
  const noteReady = note.trim().length >= REVIEW_NOTE_MIN

  const submit = async (decision: ReviewDecision) => {
    if (submitting) return
    setSubmitting(decision)
    setError(undefined)
    try {
      onReviewed(await reviewReport(report.id, decision, decision === 'rejected' ? note : undefined))
      setRejecting(false)
      setNote('')
    } catch (caught) {
      setError(errorText(caught, t, 'admin.reports.reviewFailed'))
    } finally {
      setSubmitting(undefined)
    }
  }

  return (
    <div className="grid gap-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-ink">{t('admin.reports.reviewTitle')}</h2>
        <ReviewBadge state={state} />
      </div>
      <dl className="grid gap-1 text-xs text-stone-600">
        <div>
          {t(`admin.clinic.${report.clinic_id}`)} · <span className="uppercase">{report.document_locale}</span>
        </div>
        <div>
          {t('admin.reports.submittedBy', { name: report.employee_name_snapshot, date: when(report.finalized_at) })}
        </div>
      </dl>

      {review ? (
        <section className="grid gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
          <p className="text-xs text-stone-600">
            {t(review.decision === 'approved' ? 'admin.reports.approvedBy' : 'admin.reports.rejectedBy', {
              name: reviewerName ?? t('admin.common.historical'),
              date: when(review.created_at),
            })}
          </p>
          {review.note && <p className="whitespace-pre-wrap text-ink [overflow-wrap:anywhere]">{review.note}</p>}
          {corrections.length > 0 && (
            <p className="text-xs font-semibold text-stone-700">
              {t('admin.reports.correctionSubmitted', { date: when(corrections[0]!.finalized_at) })}
            </p>
          )}
        </section>
      ) : isOwnReport ? (
        <p className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-stone-700">
          {t('admin.reports.ownReport')}
        </p>
      ) : rejecting ? (
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (noteReady) void submit('rejected')
          }}
        >
          <label htmlFor={noteId} className="font-semibold text-ink">
            {t('admin.reports.rejectNoteLabel')}
          </label>
          <textarea
            id={noteId}
            required
            autoFocus
            rows={6}
            minLength={REVIEW_NOTE_MIN}
            maxLength={REVIEW_NOTE_MAX}
            aria-describedby={hintId}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t('admin.reports.rejectNotePlaceholder')}
            className="w-full rounded-md border border-stone-300 bg-white p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
          <p id={hintId} className="text-xs text-stone-600">
            {t('admin.reports.rejectNoteHint', { min: REVIEW_NOTE_MIN })} · {note.length}/{REVIEW_NOTE_MAX}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="danger"
              disabled={!noteReady || Boolean(submitting)}
              aria-busy={submitting === 'rejected'}
            >
              {submitting === 'rejected' ? (
                <LoaderCircle size={15} className="animate-spin motion-reduce:animate-none" />
              ) : (
                <X size={15} />
              )}
              {t('admin.reports.rejectSubmit')}
            </Button>
            <Button disabled={Boolean(submitting)} onClick={() => setRejecting(false)}>
              {t('admin.common.cancel')}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            disabled={Boolean(submitting)}
            aria-busy={submitting === 'approved'}
            onClick={() => void submit('approved')}
          >
            {submitting === 'approved' ? (
              <LoaderCircle size={15} className="animate-spin motion-reduce:animate-none" />
            ) : (
              <Check size={15} />
            )}
            {t('admin.reports.approve')}
          </Button>
          <Button variant="danger" disabled={Boolean(submitting)} onClick={() => setRejecting(true)}>
            <X size={15} />
            {t('admin.reports.reject')}
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}

      <Button disabled={downloading} aria-busy={downloading} onClick={onDownload}>
        {downloading ? (
          <LoaderCircle size={15} className="animate-spin motion-reduce:animate-none" />
        ) : (
          <Download size={15} />
        )}
        {t('admin.reports.download')}
      </Button>
    </div>
  )
}
