begin;

-- requested_phone_e164 doubles as the sign-in identity for sales staff. Profile settings let users
-- edit their own phone, so without a check a user could point their profile at a colleague's number
-- and make that number resolve to more than one profile. Non-admins may therefore only set a phone
-- that no other profile already uses; admins (and direct SQL, where auth.uid() is null) are unrestricted.
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

commit;
