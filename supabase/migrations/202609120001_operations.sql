begin;

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  email text not null,
  role text not null default 'SALES' check (role in ('ADMIN', 'SALES')),
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended', 'former')),
  requested_phone_e164 text not null check (requested_phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.communication_channels (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null unique check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  type text not null default 'whatsapp' check (type in ('whatsapp', 'phone')),
  label text not null default '',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.channel_assignments (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.communication_channels(id) on delete restrict,
  employee_id uuid not null references public.profiles(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  check (unassigned_at is null or unassigned_at >= assigned_at)
);

create unique index channel_assignments_one_current_channel_idx
  on public.channel_assignments(channel_id) where unassigned_at is null;
create unique index channel_assignments_one_current_employee_idx
  on public.channel_assignments(employee_id) where unassigned_at is null;
create index channel_assignments_channel_idx on public.channel_assignments(channel_id, assigned_at desc);
create index channel_assignments_employee_idx on public.channel_assignments(employee_id, assigned_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  created_by_employee_id uuid not null references public.profiles(id) on delete restrict,
  clinic_id text not null check (clinic_id in ('aksu', 'mb-dental')),
  document_locale text not null,
  currency text not null check (currency in ('GBP', 'EUR', 'USD', 'TRY')),
  patient_name text not null,
  patient_phone text not null,
  patient_identifier text,
  report_payload jsonb not null,
  first_visit_total_minor bigint not null check (first_visit_total_minor >= 0),
  second_visit_total_minor bigint not null check (second_visit_total_minor >= 0),
  employee_name_snapshot text not null,
  employee_phone_snapshot text not null,
  communication_channel_id uuid references public.communication_channels(id) on delete restrict,
  template_version text not null,
  status text not null default 'finalized' check (status = 'finalized'),
  created_at timestamptz not null default now(),
  finalized_at timestamptz not null default now(),
  pdf_storage_key text not null unique,
  pdf_sha256 text not null check (pdf_sha256 ~ '^[0-9a-f]{64}$'),
  parent_report_id uuid references public.reports(id) on delete restrict
);

create index reports_created_by_employee_idx on public.reports(created_by_employee_id);
create index reports_finalized_at_idx on public.reports(finalized_at desc);
create index reports_clinic_id_idx on public.reports(clinic_id);
create index reports_document_locale_idx on public.reports(document_locale);
create index reports_communication_channel_idx on public.reports(communication_channel_id);
create index reports_patient_name_idx on public.reports(lower(patient_name));

create table public.report_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete restrict,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null check (event_type in ('finalized', 'downloaded', 'admin_downloaded', 'duplicated')),
  created_at timestamptz not null default now()
);

create index report_events_report_idx on public.report_events(report_id, created_at desc);
create index report_events_actor_idx on public.report_events(actor_id, created_at desc);

create or replace function public.is_active_user(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = user_id and status = 'active') $$;

create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = user_id and role = 'ADMIN' and status = 'active') $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, status, requested_phone_e164)
  values (
    new.id,
    trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')),
    lower(new.email),
    'SALES',
    'pending',
    coalesce(new.raw_user_meta_data ->> 'work_phone_e164', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.guard_profile_privileged_fields()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() = old.id and
     (new.role <> old.role or new.status <> old.status or new.email <> old.email) then
    raise exception 'users cannot change their own role, status, or email';
  end if;
  if not public.is_admin() and
     (new.role <> old.role or new.status <> old.status or new.email <> old.email) then
    raise exception 'privileged profile fields are admin-only';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger guard_profile_privileged_fields
before update on public.profiles for each row execute function public.guard_profile_privileged_fields();

create or replace function public.prevent_report_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'finalized reports are immutable';
end;
$$;

create trigger reports_immutable before update or delete on public.reports
for each row execute function public.prevent_report_mutation();

create or replace function public.unassign_inactive_channel()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if old.status = 'active' and new.status = 'inactive' then
    update public.channel_assignments
    set unassigned_at = now()
    where channel_id = new.id and unassigned_at is null;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger communication_channel_status_lifecycle
before update on public.communication_channels for each row
execute function public.unassign_inactive_channel();

create or replace function public.visit_total_minor(p_rows jsonb)
returns bigint language sql immutable set search_path = public
as $$
  select coalesce(sum(
    case
      when coalesce((row_data ->> 'enabled')::boolean, false) = false
        or coalesce((row_data ->> 'included')::boolean, false) = true then 0
      else round(coalesce((row_data ->> 'quantity')::numeric, 0)
        * round(coalesce((row_data ->> 'unitPrice')::numeric, 0) * 100))
    end
  ), 0)::bigint
  from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) row_data;
$$;

create or replace function public.finalize_report(
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
  if p_pdf_storage_key !~ ('^' || auth.uid()::text || '/[0-9a-f-]{36}\\.pdf$')
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

create or replace function public.log_report_download(p_report_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare owner_id uuid;
begin
  if not public.is_active_user() then raise exception 'active account required'; end if;
  select created_by_employee_id into owner_id from public.reports where id = p_report_id;
  if owner_id is null or (owner_id <> auth.uid() and not public.is_admin()) then raise exception 'not authorized'; end if;
  insert into public.report_events(report_id, actor_id, event_type)
  values (p_report_id, auth.uid(), case when public.is_admin() then 'admin_downloaded' else 'downloaded' end);
end;
$$;

create or replace function public.assign_channel(p_channel_id uuid, p_employee_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'admin required'; end if;
  if not exists(select 1 from public.communication_channels where id=p_channel_id and status='active') then raise exception 'active channel required'; end if;
  if not exists(select 1 from public.profiles where id=p_employee_id and status in ('pending','active')) then raise exception 'assignable employee required'; end if;
  update public.channel_assignments set unassigned_at=now()
    where unassigned_at is null and (channel_id=p_channel_id or employee_id=p_employee_id);
  insert into public.channel_assignments(channel_id, employee_id, assigned_by)
    values(p_channel_id, p_employee_id, auth.uid());
end;
$$;

create or replace function public.unassign_channel(p_channel_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'admin required'; end if;
  update public.channel_assignments set unassigned_at=now() where channel_id=p_channel_id and unassigned_at is null;
end;
$$;

create or replace function public.offboard_employee(p_employee_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() or p_status not in ('suspended','former') then raise exception 'admin required'; end if;
  update public.profiles set status=p_status, updated_at=now() where id=p_employee_id and role <> 'ADMIN';
  update public.channel_assignments set unassigned_at=now() where employee_id=p_employee_id and unassigned_at is null;
end;
$$;

alter table public.profiles enable row level security;
alter table public.communication_channels enable row level security;
alter table public.channel_assignments enable row level security;
alter table public.reports enable row level security;
alter table public.report_events enable row level security;

create policy profiles_select on public.profiles for select to authenticated
using (id = auth.uid() or (public.is_active_user() and public.is_admin()));
create policy profiles_update on public.profiles for update to authenticated
using (public.is_active_user() and (id = auth.uid() or public.is_admin()))
with check (public.is_active_user() and (id = auth.uid() or public.is_admin()));

create policy channels_admin_all on public.communication_channels for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy channels_assigned_select on public.communication_channels for select to authenticated
using (public.is_active_user() and exists(select 1 from public.channel_assignments ca where ca.channel_id=id and ca.employee_id=auth.uid() and ca.unassigned_at is null));

create policy assignments_admin_all on public.channel_assignments for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy assignments_own_select on public.channel_assignments for select to authenticated
using (public.is_active_user() and employee_id=auth.uid());

create policy reports_select on public.reports for select to authenticated
using (public.is_active_user() and (created_by_employee_id=auth.uid() or public.is_admin()));
create policy events_select on public.report_events for select to authenticated
using (public.is_active_user() and (actor_id=auth.uid() or public.is_admin()));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('report-pdfs', 'report-pdfs', false, 15728640, array['application/pdf'])
on conflict(id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

create policy report_pdf_insert on storage.objects for insert to authenticated
with check (bucket_id='report-pdfs' and public.is_active_user() and (storage.foldername(name))[1]=auth.uid()::text);
create policy report_pdf_select on storage.objects for select to authenticated
using (bucket_id='report-pdfs' and public.is_active_user() and exists(
  select 1 from public.reports r where r.pdf_storage_key=name and (r.created_by_employee_id=auth.uid() or public.is_admin())
));
create policy report_pdf_orphan_delete on storage.objects for delete to authenticated
using (bucket_id='report-pdfs' and (storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.reports r where r.pdf_storage_key=name));

revoke all on public.profiles, public.communication_channels, public.channel_assignments, public.reports, public.report_events from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.communication_channels to authenticated;
grant select on public.channel_assignments, public.reports, public.report_events to authenticated;

revoke execute on function public.finalize_report(text,text,text,text,text,text,jsonb,bigint,bigint,text,text,text,uuid) from public, anon;
revoke execute on function public.log_report_download(uuid) from public, anon;
revoke execute on function public.assign_channel(uuid,uuid) from public, anon;
revoke execute on function public.unassign_channel(uuid) from public, anon;
revoke execute on function public.offboard_employee(uuid,text) from public, anon;
grant execute on function public.finalize_report(text,text,text,text,text,text,jsonb,bigint,bigint,text,text,text,uuid) to authenticated;
grant execute on function public.log_report_download(uuid) to authenticated;
grant execute on function public.assign_channel(uuid,uuid) to authenticated;
grant execute on function public.unassign_channel(uuid) to authenticated;
grant execute on function public.offboard_employee(uuid,text) to authenticated;

commit;
