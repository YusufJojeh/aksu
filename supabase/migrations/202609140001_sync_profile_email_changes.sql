begin;

create or replace function public.sync_profile_email_from_auth()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.email is not null and new.email is distinct from old.email then
    update public.profiles
    set email = lower(new.email), updated_at = now()
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
after update of email on auth.users
for each row execute function public.sync_profile_email_from_auth();

commit;
