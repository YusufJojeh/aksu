import type { ArchivedReport, ReportReview, ReviewState } from './operations'

/** Reviews keyed by report id; the database allows at most one decision per report. */
export function reviewsByReport(reviews: ReportReview[]): Map<string, ReportReview> {
  return new Map(reviews.map((review) => [review.report_id, review]))
}

/** A report without a decision is waiting for review; finalization alone never implies approval. */
export function reviewStateOf(review: ReportReview | undefined): ReviewState {
  return review?.decision ?? 'pending_review'
}

/** Copies edited from this report, newest first: how a rejected report gets corrected and resubmitted. */
export function correctionsOf(reports: ArchivedReport[], reportId: string): ArchivedReport[] {
  return reports
    .filter((report) => report.parent_report_id === reportId)
    .sort((a, b) => b.finalized_at.localeCompare(a.finalized_at))
}
