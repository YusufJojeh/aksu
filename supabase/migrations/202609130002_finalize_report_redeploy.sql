begin;

-- Production smoke testing found finalize_report() raising 'invalid archive
-- identity' for calls whose arguments independently verified as valid against
-- the exact same predicate (checked via ad hoc probe functions with identical
-- logic, run through the same PostgREST/pgbouncer transaction-pooled path).
-- A plain CREATE OR REPLACE of the function body -- no logic change -- made
-- the failure stop reproducing across repeated calls afterward, consistent
-- with a stale cached plan on a pooled backend rather than a logic defect.
-- Dropping and recreating (instead of CREATE OR REPLACE) forces Postgres's
-- catalog invalidation to propagate unambiguously to every pooled backend.
drop function if exists public.finalize_report(
  text, text, text, text, text, text, jsonb, bigint, bigint, text, text, text, uuid
);

create function public.finalize_report(
  p_clinic_id text,
  p_document_locale text,
  p_currency text,
  p_patient_name text,
  p_patient_phone text,
  p_patient_identifier text,
  p_report_payload jsonb,
  p_first_visit_total_minor bigint,
  p_second_visit_total_minor bigint,
  p_template_version text,
  p_pdf_storage_key text,
  p_pdf_sha256 text,
  p_parent_report_id uuid default null
) returns public.reports
language plpgsql security definer set search_path = public, storage
as $$
declare
  actor public.profiles;
  assignment record;
  created public.reports;
begin
  select * into actor from public.profiles where id = auth.uid() and status = 'active';
  if actor.id is null then raise exception 'active account required'; end if;
  if p_clinic_id not in ('aksu', 'mb-dental')
    or p_currency not in ('GBP', 'EUR', 'USD', 'TRY')
    or (p_clinic_id = 'mb-dental' and p_document_locale not in ('en', 'fr', 'de', 'ar'))
    or (p_clinic_id = 'aksu' and p_document_locale not in ('en', 'ar', 'fr', 'tr', 'de', 'es', 'ru', 'pl', 'it')) then
    raise exception 'unsupported report configuration';
  end if;
  if p_report_payload ->> 'clinicId' <> p_clinic_id
    or p_report_payload #>> '{document,locale}' <> p_document_locale
    or p_report_payload #>> '{document,currency}' <> p_currency
    or trim(p_report_payload #>> '{patient,name}') <> trim(p_patient_name) then
    raise exception 'report metadata does not match its payload';
  end if;
  if public.visit_total_minor(p_report_payload #> '{firstVisit,treatmentRows}') <> p_first_visit_total_minor
    or public.visit_total_minor(p_report_payload #> '{secondVisit,treatmentRows}') <> p_second_visit_total_minor then
    raise exception 'report totals do not match its payload';
  end if;
  if p_pdf_storage_key !~ ('^' || auth.uid()::text || '/[0-9a-f-]{36}\.pdf$')
    or p_pdf_sha256 !~ '^[0-9a-fA-F]{64}$' then
    raise exception 'invalid archive identity';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'report-pdfs' and name = p_pdf_storage_key
  ) then
    raise exception 'archived PDF is missing';
  end if;
  if p_parent_report_id is not null and not exists (
    select 1 from public.reports
    where id = p_parent_report_id and (created_by_employee_id = actor.id or public.is_admin())
  ) then
    raise exception 'parent report is not accessible';
  end if;
  select ca.channel_id, cc.phone_e164 into assignment
  from public.channel_assignments ca join public.communication_channels cc on cc.id = ca.channel_id
  where ca.employee_id = actor.id and ca.unassigned_at is null and cc.status = 'active'
  limit 1;
  insert into public.reports (
    created_by_employee_id, clinic_id, document_locale, currency, patient_name, patient_phone,
    patient_identifier, report_payload, first_visit_total_minor, second_visit_total_minor,
    employee_name_snapshot, employee_phone_snapshot, communication_channel_id, template_version,
    pdf_storage_key, pdf_sha256, parent_report_id
  ) values (
    actor.id, p_clinic_id, p_document_locale, p_currency, trim(p_patient_name), trim(p_patient_phone),
    nullif(trim(p_patient_identifier), ''), p_report_payload, p_first_visit_total_minor, p_second_visit_total_minor,
    actor.full_name, coalesce(assignment.phone_e164, actor.requested_phone_e164), assignment.channel_id,
    p_template_version, p_pdf_storage_key, lower(p_pdf_sha256), p_parent_report_id
  ) returning * into created;
  insert into public.report_events(report_id, actor_id, event_type) values(created.id, actor.id, 'finalized');
  if p_parent_report_id is not null then
    insert into public.report_events(report_id, actor_id, event_type) values(created.id, actor.id, 'duplicated');
  end if;
  return created;
end;
$$;

grant execute on function public.finalize_report(
  text, text, text, text, text, text, jsonb, bigint, bigint, text, text, text, uuid
) to authenticated;

drop function if exists public.debug_auth_probe();
drop function if exists public.debug_archive_probe(text, text);
drop function if exists public.debug_archive_probe2(text, text);

commit;
