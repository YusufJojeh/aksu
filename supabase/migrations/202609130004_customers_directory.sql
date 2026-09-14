begin;

-- Admin-facing patient/customer directory, decoupled from any single report. Reports themselves
-- stay immutable (patient details are frozen into report_payload at finalize time), so this table
-- exists purely so admins can maintain a live, editable record of who a clinic's patients are —
-- it is never read by finalize_report and never mutates historical report rows.
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  clinic_id text not null check (clinic_id in ('aksu', 'mb-dental')),
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  phone_e164 text check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  patient_identifier text,
  notes text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by_employee_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_clinic_id_idx on public.customers(clinic_id);
create index customers_full_name_idx on public.customers(lower(full_name));
create index customers_status_idx on public.customers(status);

-- created_by_employee_id always reflects who actually made the request, never a client-supplied
-- value; updated_at is server-controlled the same way every other admin-editable table here does it.
create or replace function public.customers_guard()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by_employee_id = auth.uid();
  else
    new.created_by_employee_id = old.created_by_employee_id;
    new.created_at = old.created_at;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger customers_guard
before insert or update on public.customers for each row execute function public.customers_guard();

alter table public.customers enable row level security;
create policy customers_admin_all on public.customers for all to authenticated
using (public.is_admin()) with check (public.is_admin());

revoke all on public.customers from anon, authenticated;
grant select, insert, update on public.customers to authenticated;

commit;
