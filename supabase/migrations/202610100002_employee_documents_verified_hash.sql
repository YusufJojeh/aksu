begin;

-- employee_documents previously trusted the client-computed pdf_sha256. Mirror finalize_report():
-- the insert is only allowed when api/reports/verify-pdf (service role) has downloaded the object,
-- re-hashed it, and recorded that exact hash in report_pdf_checksums.
--
-- report_pdf_checksums is closed to anon/authenticated, and an RLS policy runs as the caller, so
-- this definer helper answers only "was this exact hash recorded for this key".
create or replace function public.pdf_checksum_verified(p_storage_key text, p_sha256 text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.report_pdf_checksums
    where storage_key = p_storage_key and pdf_sha256 = lower(p_sha256)
  )
$$;

revoke execute on function public.pdf_checksum_verified(text, text) from public, anon;
grant execute on function public.pdf_checksum_verified(text, text) to authenticated;

drop policy employee_documents_insert on public.employee_documents;
create policy employee_documents_insert on public.employee_documents for insert to authenticated
with check (
  public.is_active_user()
  and created_by_employee_id = auth.uid()
  and pdf_storage_key ~ ('^' || auth.uid()::text || '/documents/[0-9a-f-]{36}\.pdf$')
  and public.storage_object_exists('report-pdfs', pdf_storage_key)
  and public.pdf_checksum_verified(pdf_storage_key, pdf_sha256)
);

commit;
