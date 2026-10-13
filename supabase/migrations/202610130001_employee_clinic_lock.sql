begin;

-- A sales employee can be locked to one clinic. profiles.clinic_id is null for the existing behaviour
-- (the employee picks Aksu or MB Dental); when set, the UI skips the clinic picker and opens that clinic,
-- and finalize_report refuses any other clinic so the lock holds even against a hand-built request.
alter table public.profiles
  add column clinic_id text check (clinic_id in ('aksu', 'mb-dental'));

-- The lock is admin-controlled: users cannot move themselves to another clinic. Admins and direct SQL
-- (auth.uid() is null, as the import script and migrations run) stay unrestricted.
create or replace function public.guard_profile_privileged_fields()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    new.updated_at = now();
    return new;
  end if;
  if auth.uid() = old.id and
     (new.role <> old.role or new.status <> old.status or new.email <> old.email
       or new.clinic_id is distinct from old.clinic_id) then
    raise exception 'users cannot change their own role, status, email, or clinic';
  end if;
  if not public.is_admin() and
     (new.role <> old.role or new.status <> old.status or new.email <> old.email
       or new.clinic_id is distinct from old.clinic_id) then
    raise exception 'privileged profile fields are admin-only';
  end if;
  if not public.is_admin()
     and new.requested_phone_e164 is distinct from old.requested_phone_e164
     and exists (
       select 1 from public.profiles other
       where other.requested_phone_e164 = new.requested_phone_e164 and other.id <> old.id
     ) then
    raise exception 'this phone number is already used by another profile';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

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
  v_channel_id uuid;
  v_phone_e164 text;
  created public.reports;
begin
  select * into actor from public.profiles where id = auth.uid() and status = 'active';
  if actor.id is null then raise exception 'active account required'; end if;
  if actor.clinic_id is not null and actor.clinic_id <> p_clinic_id then
    raise exception 'this account is limited to another clinic';
  end if;
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
  if not exists (
    select 1 from public.report_pdf_checksums
    where storage_key = p_pdf_storage_key and pdf_sha256 = lower(p_pdf_sha256)
  ) then
    raise exception 'pdf hash has not been verified against the archived object';
  end if;
  if p_parent_report_id is not null and not exists (
    select 1 from public.reports
    where id = p_parent_report_id and (created_by_employee_id = actor.id or public.is_admin())
  ) then
    raise exception 'parent report is not accessible';
  end if;

  select ca.channel_id, cc.phone_e164 into v_channel_id, v_phone_e164
  from public.channel_assignments ca join public.communication_channels cc on cc.id = ca.channel_id
  where ca.employee_id = actor.id and ca.unassigned_at is null and cc.status = 'active'
  limit 1;

  if v_channel_id is null then
    select cc.id, cc.phone_e164 into v_channel_id, v_phone_e164
    from public.communication_channels cc
    where cc.status = 'active'
      and not exists (
        select 1 from public.channel_assignments ca2
        where ca2.channel_id = cc.id and ca2.unassigned_at is null
      )
    order by cc.created_at asc
    limit 1
    for update of cc skip locked;

    if v_channel_id is not null then
      begin
        insert into public.channel_assignments(channel_id, employee_id, assigned_by)
        values (v_channel_id, actor.id, actor.id);
      exception when unique_violation then
        -- Lost a race against assign_channel/unassign_channel (which don't lock the channel row)
        -- or a concurrent duplicate finalize_report call for this same employee. Fall back to no
        -- channel rather than aborting the whole report -- identical to the no-free-channel path.
        v_channel_id := null;
        v_phone_e164 := null;
      end;
    end if;
  end if;

  insert into public.reports (
    created_by_employee_id, clinic_id, document_locale, currency, patient_name, patient_phone,
    patient_identifier, report_payload, first_visit_total_minor, second_visit_total_minor,
    employee_name_snapshot, employee_phone_snapshot, communication_channel_id, template_version,
    pdf_storage_key, pdf_sha256, parent_report_id
  ) values (
    actor.id, p_clinic_id, p_document_locale, p_currency, trim(p_patient_name), trim(p_patient_phone),
    nullif(trim(p_patient_identifier), ''), p_report_payload, p_first_visit_total_minor, p_second_visit_total_minor,
    actor.full_name, coalesce(v_phone_e164, actor.requested_phone_e164), v_channel_id,
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

commit;
