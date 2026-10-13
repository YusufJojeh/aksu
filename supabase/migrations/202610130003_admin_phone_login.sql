begin;

-- Phone-only sign-in stays closed to administrators unless one specific number is switched on here.
-- Service-role written (the table has no client grants), so an admin cannot be enabled from the app.
--
-- Rollback: alter table public.profile_login_phones drop column admin_login;
alter table public.profile_login_phones
  add column admin_login boolean not null default false;

commit;
