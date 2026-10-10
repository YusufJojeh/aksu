begin;

-- Archive of the MB warranty certificates and invitation letters sales staff generate. They are not
-- treatment reports (different page counts, no totals), so they live beside `reports` rather than in it.
-- Rows are immutable, like reports: a changed document is archived as a new row.
create table public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  created_by_employee_id uuid not null references public.profiles(id) on delete restrict,
  kind text not null check (kind in ('warranty', 'invitation')),
  patient_name text not null default '' check (char_length(patient_name) <= 120),
  payload jsonb not null,
  pdf_storage_key text not null unique,
  pdf_sha256 text not null check (pdf_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create index employee_documents_owner_idx on public.employee_documents(created_by_employee_id, created_at desc);

create trigger employee_documents_immutable before update or delete on public.employee_documents
for each row execute function public.prevent_report_mutation();

-- storage.objects has its own RLS, so a policy on this table cannot read it as the caller; this
-- definer helper answers only "does an object exist at this key".
create or replace function public.storage_object_exists(p_bucket text, p_name text)
returns boolean language sql stable security definer set search_path = public, storage
as $$ select exists (select 1 from storage.objects where bucket_id = p_bucket and name = p_name) $$;

revoke execute on function public.storage_object_exists(text, text) from public, anon;
grant execute on function public.storage_object_exists(text, text) to authenticated;

alter table public.employee_documents enable row level security;

create policy employee_documents_select on public.employee_documents for select to authenticated
using (public.is_active_user() and (created_by_employee_id = auth.uid() or public.is_admin()));

create policy employee_documents_insert on public.employee_documents for insert to authenticated
with check (
  public.is_active_user()
  and created_by_employee_id = auth.uid()
  and pdf_storage_key ~ ('^' || auth.uid()::text || '/documents/[0-9a-f-]{36}\.pdf$')
  and public.storage_object_exists('report-pdfs', pdf_storage_key)
);

revoke all on public.employee_documents from anon, authenticated;
grant select, insert on public.employee_documents to authenticated;

-- Let owners (and admins) read the archived files; uploads already work through report_pdf_insert.
create policy employee_document_pdf_select on storage.objects for select to authenticated
using (bucket_id = 'report-pdfs' and public.is_active_user() and exists (
  select 1 from public.employee_documents d
  where d.pdf_storage_key = name and (d.created_by_employee_id = auth.uid() or public.is_admin())
));

commit;
