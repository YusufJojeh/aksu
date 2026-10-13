begin;

-- An employee can sign in with more than one phone number. profiles.requested_phone_e164 stays the
-- primary number (and the report channel fallback); this table holds the extra numbers that also open
-- the same account through the phone-only sign-in. A number identifies exactly one profile.
--
-- Written only by the service role (import script / server code): RLS is on and nothing is granted to
-- anon or authenticated, so no client can add a number to someone else's account.
--
-- Rollback: drop table public.profile_login_phones;
create table public.profile_login_phones (
  phone_e164 text primary key check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index profile_login_phones_profile_idx on public.profile_login_phones (profile_id);

alter table public.profile_login_phones enable row level security;
revoke all on public.profile_login_phones from anon, authenticated;

commit;
