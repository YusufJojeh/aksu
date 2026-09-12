create table if not exists reports (
  id uuid primary key,
  employee_name text not null,
  clinic_id text not null,
  locale text not null,
  patient_name text not null default '',
  blob_pathname text not null,
  blob_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists reports_created_at_idx on reports (created_at desc);
create index if not exists reports_employee_name_idx on reports (employee_name);
create index if not exists reports_clinic_id_idx on reports (clinic_id);
