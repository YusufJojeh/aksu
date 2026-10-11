import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/202609120001_operations.sql', 'utf8')
const migrations = readdirSync('supabase/migrations')
  .filter((file) => file.endsWith('.sql'))
  .map((file) => readFileSync(`supabase/migrations/${file}`, 'utf8'))
  .join('\n')

describe('production authorization migration', () => {
  it('enables RLS for every patient and operational table', () => {
    for (const table of ['profiles', 'communication_channels', 'channel_assignments', 'reports', 'report_events']) {
      expect(migration).toContain(`alter table public.${table} enable row level security`)
    }
  })

  it('keeps sales report access owner-scoped and admin access explicit', () => {
    expect(migration).toContain('created_by_employee_id=auth.uid() or public.is_admin()')
    expect(migration).toContain("bucket_id='report-pdfs'")
    expect(migration).toContain('public.is_active_user()')
  })

  it('enforces one active channel owner and immutable report history', () => {
    expect(migration).toContain('channel_assignments_one_current_channel_idx')
    expect(migration).toContain('where unassigned_at is null')
    expect(migration).toContain('reports_immutable')
    expect(migration).toContain('employee_name_snapshot')
    expect(migration).toContain('employee_phone_snapshot')
    expect(migration).toContain('pdf_sha256')
  })

  it('never permits registration metadata to create an admin', () => {
    expect(migration).toMatch(/new\.id,[\s\S]*?'SALES',[\s\S]*?'pending'/)
  })

  it('validates archive identity, payload totals, and restricted grants server-side', () => {
    expect(migration).toContain("p_pdf_storage_key !~ ('^' || auth.uid()::text")
    expect(migration).toContain('visit_total_minor')
    expect(migration).toContain('report totals do not match its payload')
    expect(migration).toContain('revoke all on public.profiles')
    expect(migration).toContain('revoke execute on function public.finalize_report')
  })

  it('allows users to edit their own profile while guarding privileged fields', () => {
    expect(migration).toContain('create policy profiles_update on public.profiles')
    expect(migration).toContain('id = auth.uid() or public.is_admin()')
    expect(migration).toContain('users cannot change their own role, status, or email')
    expect(migration).toContain('privileged profile fields are admin-only')
    expect(migration).toContain('grant select, update on public.profiles to authenticated')
  })

  it('syncs confirmed Auth email changes into profiles', () => {
    expect(migrations).toContain('create or replace function public.sync_profile_email_from_auth()')
    expect(migrations).toContain('after update of email on auth.users')
    expect(migrations).toContain('set email = lower(new.email)')
  })

  it('unassigns inactive numbers and records duplicate lineage', () => {
    expect(migration).toContain('communication_channel_status_lifecycle')
    expect(migration).toContain("new.status = 'inactive'")
    expect(migration).toContain("event_type) values(created.id, actor.id, 'duplicated')")
  })

  it('stops non-admins from claiming a phone number another profile already uses', () => {
    expect(migrations).toContain('this phone number is already used by another profile')
  })

  it('keeps archived warranty and invitation documents owner-scoped and immutable', () => {
    expect(migrations).toContain('alter table public.employee_documents enable row level security')
    expect(migrations).toContain('created_by_employee_id = auth.uid()')
    expect(migrations).toContain('employee_documents_immutable')
    expect(migrations).toContain('grant select, insert on public.employee_documents')
  })
})

describe('report review migration', () => {
  const review = readFileSync('supabase/migrations/202610110001_report_reviews.sql', 'utf8')

  it('keeps one append-only decision per report, readable only by admins and the report owner', () => {
    expect(review).toContain('alter table public.report_reviews enable row level security')
    expect(review).toContain('revoke all on public.report_reviews from anon, authenticated')
    expect(review).toContain('grant select on public.report_reviews to authenticated')
    expect(review).not.toMatch(/grant[^;]*(insert|update|delete)[^;]*report_reviews/)
    expect(review).toContain('constraint report_reviews_one_decision unique (report_id)')
    expect(review).toContain('before update or delete on public.report_reviews')
    expect(review).toContain('r.created_by_employee_id = auth.uid()')
  })

  it('validates decisions server-side and takes the reviewer from the session', () => {
    expect(review).toContain("if not public.is_admin() then raise exception 'admin_required'")
    expect(review).toContain("raise exception 'review_note_required'")
    expect(review).toContain("raise exception 'cannot_review_own_report'")
    expect(review).toContain("raise exception 'report_already_reviewed'")
    expect(review).toContain('values (target.id, target.pdf_sha256, auth.uid(), p_decision, clean_note)')
    expect(review).toContain("check (decision <> 'rejected' or char_length(btrim(note)) >= 10)")
    expect(review).toContain('revoke execute on function public.review_report(uuid, text, text) from public, anon')
  })

  it('never edits the immutable report or assumes old reports were approved', () => {
    expect(review).not.toMatch(/update\s+public\.reports/i)
    expect(review).not.toMatch(/insert into public\.report_reviews[\s\S]*select[\s\S]*from public\.reports/i)
  })
})
