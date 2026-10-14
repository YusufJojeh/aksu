begin;

-- TEAM_LEAD: a manager who sees everything an admin sees and reviews reports (approve / reject, with the
-- optional voice note), but cannot create, edit, suspend or delete accounts, move communication numbers,
-- or edit customers. Those writes keep using is_admin(); only reads and the review use is_manager().
--
-- Rollback (only while no team lead exists):
--   drop function public.is_manager(uuid);  (after dropping the policies named *_manager_select / review_voice_*)
--   alter table public.profiles drop constraint profiles_role_check;
--   alter table public.profiles add constraint profiles_role_check check (role in ('ADMIN', 'SALES'));
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('ADMIN', 'SALES', 'TEAM_LEAD'));

create or replace function public.is_manager(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.profiles where id = user_id and role in ('ADMIN', 'TEAM_LEAD') and status = 'active'
) $$;

-- Read access: an extra permissive SELECT policy per table, next to the existing owner / admin ones.
create policy profiles_manager_select on public.profiles for select to authenticated
using (public.is_manager());
create policy reports_manager_select on public.reports for select to authenticated
using (public.is_manager());
create policy events_manager_select on public.report_events for select to authenticated
using (public.is_manager());
create policy channels_manager_select on public.communication_channels for select to authenticated
using (public.is_manager());
create policy assignments_manager_select on public.channel_assignments for select to authenticated
using (public.is_manager());
create policy customers_manager_select on public.customers for select to authenticated
using (public.is_manager());
create policy employee_documents_manager_select on public.employee_documents for select to authenticated
using (public.is_manager());
create policy report_reviews_manager_select on public.report_reviews for select to authenticated
using (public.is_manager());

grant select on public.customers, public.employee_documents to authenticated;

-- Archived PDFs (reports and employee documents) are readable by managers.
create policy report_pdf_manager_select on storage.objects for select to authenticated
using (bucket_id = 'report-pdfs' and public.is_manager());

-- Voice notes: managers record and hear them, like admins.
drop policy review_voice_insert on storage.objects;
create policy review_voice_insert on storage.objects for insert to authenticated
with check (bucket_id = 'review-voice-notes' and public.is_manager());
create policy review_voice_manager_select on storage.objects for select to authenticated
using (bucket_id = 'review-voice-notes' and public.is_manager());
drop policy review_voice_orphan_delete on storage.objects;
create policy review_voice_orphan_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'review-voice-notes' and public.is_manager()
  and not exists (select 1 from public.report_reviews rr where rr.voice_note_key = storage.objects.name)
);

-- Downloading an archived PDF is logged for managers too (admin_downloaded covers both).
create or replace function public.log_report_download(p_report_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare owner_id uuid;
begin
  if not public.is_active_user() then raise exception 'active account required'; end if;
  select created_by_employee_id into owner_id from public.reports where id = p_report_id;
  if owner_id is null or (owner_id <> auth.uid() and not public.is_manager()) then raise exception 'not authorized'; end if;
  insert into public.report_events(report_id, actor_id, event_type)
  values (p_report_id, auth.uid(), case when public.is_manager() then 'admin_downloaded' else 'downloaded' end);
end;
$$;

-- Reviewing is the one write a team lead gets. Body identical to 202610130004 except the permission check.
create or replace function public.review_report(
  p_report_id uuid, p_decision text, p_note text default null, p_voice_note_key text default null
)
returns public.report_reviews
language plpgsql security definer set search_path = public, storage
as $$
declare
  target public.reports;
  clean_note text := nullif(btrim(coalesce(p_note, '')), '');
  saved public.report_reviews;
begin
  if not public.is_manager() then raise exception 'admin_required'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'invalid_review_decision'; end if;
  if p_decision = 'rejected' and char_length(coalesce(clean_note, '')) < 10 then
    raise exception 'review_note_required';
  end if;
  if char_length(coalesce(clean_note, '')) > 2000 then raise exception 'review_note_too_long'; end if;

  select * into target from public.reports where id = p_report_id;
  if not found then raise exception 'report_unavailable'; end if;
  if target.created_by_employee_id = auth.uid() then raise exception 'cannot_review_own_report'; end if;

  if p_voice_note_key is not null then
    if p_voice_note_key !~ ('^' || target.id::text || '/[0-9a-f-]{36}\.(webm|ogg|mp4|mp3|wav)$')
      or not exists (
        select 1 from storage.objects where bucket_id = 'review-voice-notes' and name = p_voice_note_key
      ) then
      raise exception 'invalid_voice_note';
    end if;
  end if;

  begin
    insert into public.report_reviews (report_id, report_pdf_sha256, reviewer_id, decision, note, voice_note_key)
    values (target.id, target.pdf_sha256, auth.uid(), p_decision, clean_note, p_voice_note_key)
    returning * into saved;
  exception when unique_violation then
    raise exception 'report_already_reviewed';
  end;
  return saved;
end;
$$;

commit;
