begin;

-- A manager can attach a voice note to a review decision. The audio lives in a private bucket under
-- <report_id>/<uuid>.<ext>; report_reviews.voice_note_key points at it (set once, at insert, so the
-- table stays append-only). Only admins upload; admins and the report's owner read.
--
-- Rollback (only while no voice notes need keeping):
--   drop function public.review_report(uuid, text, text, text);
--   alter table public.report_reviews drop column voice_note_key;
--   delete from storage.buckets where id = 'review-voice-notes';
alter table public.report_reviews add column voice_note_key text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-voice-notes', 'review-voice-notes', false, 5242880,
  array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav']
) on conflict (id) do nothing;

create policy review_voice_insert on storage.objects for insert to authenticated
with check (bucket_id = 'review-voice-notes' and public.is_active_user() and public.is_admin());

create policy review_voice_select on storage.objects for select to authenticated
using (
  bucket_id = 'review-voice-notes' and public.is_active_user() and (
    public.is_admin()
    or exists (
      select 1 from public.report_reviews rr join public.reports r on r.id = rr.report_id
      where rr.voice_note_key = storage.objects.name and r.created_by_employee_id = auth.uid()
    )
  )
);

-- An admin can clean up a recording that never got attached to a decision.
create policy review_voice_orphan_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'review-voice-notes' and public.is_admin()
  and not exists (select 1 from public.report_reviews rr where rr.voice_note_key = storage.objects.name)
);

drop function if exists public.review_report(uuid, text, text);

create function public.review_report(
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
  if not public.is_admin() then raise exception 'admin_required'; end if;
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

revoke execute on function public.review_report(uuid, text, text, text) from public, anon;
grant execute on function public.review_report(uuid, text, text, text) to authenticated;

commit;
