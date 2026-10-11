// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('../../src/lib/supabase', () => ({ requireSupabase: () => ({ rpc: mocks.rpc }) }))
import { AppError } from '../../src/lib/appError'
import { reviewReport, type ArchivedReport, type ReportReview } from '../../src/lib/operations'
import { correctionsOf, reviewStateOf, reviewsByReport } from '../../src/lib/reportReview'

const review = (report_id: string, decision: ReportReview['decision'], note: string | null = null) =>
  ({ id: `review-${report_id}`, report_id, decision, note, created_at: '2026-10-11T10:00:00Z' }) as ReportReview
const report = (id: string, parent_report_id: string | null, finalized_at: string) =>
  ({ id, parent_report_id, finalized_at }) as ArchivedReport

describe('review state', () => {
  it('treats a report without a decision as pending, never as approved', () => {
    expect(reviewStateOf(undefined)).toBe('pending_review')
    expect(reviewStateOf(review('a', 'approved'))).toBe('approved')
    expect(reviewStateOf(review('a', 'rejected', 'Fix the price list'))).toBe('rejected')
  })

  it('indexes decisions by report', () => {
    const byReport = reviewsByReport([review('a', 'approved'), review('b', 'rejected', 'Wrong clinic')])
    expect(byReport.get('b')?.note).toBe('Wrong clinic')
    expect(byReport.has('c')).toBe(false)
  })

  it('finds the corrected copies of a rejected report, newest first', () => {
    const reports = [
      report('original', null, '2026-10-01T09:00:00Z'),
      report('fix-1', 'original', '2026-10-02T09:00:00Z'),
      report('other', null, '2026-10-03T09:00:00Z'),
      report('fix-2', 'original', '2026-10-04T09:00:00Z'),
    ]
    expect(correctionsOf(reports, 'original').map((r) => r.id)).toEqual(['fix-2', 'fix-1'])
    expect(correctionsOf(reports, 'other')).toEqual([])
  })
})

describe('reviewReport', () => {
  beforeEach(() => vi.clearAllMocks())

  it('approves through the server RPC without sending a reviewer id', async () => {
    mocks.rpc.mockResolvedValue({ data: review('r1', 'approved'), error: null })
    await expect(reviewReport('r1', 'approved')).resolves.toMatchObject({ report_id: 'r1', decision: 'approved' })
    expect(mocks.rpc).toHaveBeenCalledWith('review_report', {
      p_report_id: 'r1',
      p_decision: 'approved',
      p_note: undefined,
    })
  })

  it.each(['', '   ', 'too short'])('refuses a rejection with note %j before calling the server', async (note) => {
    await expect(reviewReport('r1', 'rejected', note)).rejects.toMatchObject({ code: 'review_note_required' })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('sends the trimmed rejection note', async () => {
    mocks.rpc.mockResolvedValue({ data: review('r1', 'rejected', 'Update the implant count'), error: null })
    await reviewReport('r1', 'rejected', '  Update the implant count  ')
    expect(mocks.rpc).toHaveBeenCalledWith('review_report', {
      p_report_id: 'r1',
      p_decision: 'rejected',
      p_note: 'Update the implant count',
    })
  })

  it.each([
    ['report_already_reviewed', 'report_already_reviewed'],
    ['cannot_review_own_report', 'cannot_review_own_report'],
    ['admin_required', 'admin_required'],
    ['review_note_required', 'review_note_required'],
    ['review_note_too_long', 'review_failed'],
    ['invalid_review_decision', 'review_failed'],
    ['connection reset', 'review_failed'],
  ])('maps server error %s to %s', async (message, code) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message } })
    const failure = reviewReport('r1', 'approved').catch((caught: unknown) => caught)
    await expect(failure).resolves.toBeInstanceOf(AppError)
    await expect(failure).resolves.toMatchObject({ code })
  })
})
