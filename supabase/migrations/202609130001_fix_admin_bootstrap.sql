begin;

-- guard_profile_privileged_fields relied on auth.uid() to decide who may change
-- role/status/email. auth.uid() is only populated for requests that pass through
-- PostgREST/GoTrue with a JWT; a direct SQL connection (Supabase SQL editor, or
-- psql with the project's Postgres password) has no JWT, so auth.uid() is null
-- and the trigger blocked every update -- including the documented first-admin
-- bootstrap ("update public.profiles set role = 'ADMIN' ..." from the SQL editor).
-- Only someone holding the raw database credential can reach Postgres with a
-- null auth.uid(), so it is safe to treat that path as already privileged.
create or replace function public.guard_profile_privileged_fields()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    new.updated_at = now();
    return new;
  end if;
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

commit;
