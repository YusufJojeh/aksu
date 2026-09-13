import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/202609120001_operations.sql', 'utf8')

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

  it('unassigns inactive numbers and records duplicate lineage', () => {
    expect(migration).toContain('communication_channel_status_lifecycle')
    expect(migration).toContain("new.status = 'inactive'")
    expect(migration).toContain("event_type) values(created.id, actor.id, 'duplicated')")
  })
})
