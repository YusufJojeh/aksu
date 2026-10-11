begin;

-- Manager review of finalized reports. Finalization and review are separate: a finalized report is
-- immutable (reports_immutable), so its review decision lives here instead of on the report row.
--
-- Lifecycle: a report with no review row is pending_review. An administrator records exactly one
-- decision, approved or rejected (with a required correction note). A rejected report is corrected
-- the existing way: the employee edits it as a new copy (parent_report_id), and that new report is
-- itself pending_review. The original PDF and its decision are never changed.
--
-- Backfill: none. Every report that existed before this migration is pending_review; nothing is
-- assumed approved.
--
-- Rollback (only while no decisions need keeping):
--   drop function public.review_report(uuid, text, text);
--   drop table public.report_reviews;
--   drop function public.prevent_report_review_mutation();
create table public.report_reviews (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete restrict,
  -- The immutable artifact the decision was made on.
  report_pdf_sha256 text not null check (report_pdf_sha256 ~ '^[0-9a-f]{64}$'),
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  previous_state text not null default 'pending_review' check (previous_state = 'pending_review'),
  decision text not null check (decision in ('approved', 'rejected')),
  note text check (note is null or char_length(note) between 1 and 2000),
  created_at timestamptz not null default now(),
  -- One decision per report: a double click or two reviewers racing cannot record two outcomes.
  constraint report_reviews_one_decision unique (report_id),
  constraint report_reviews_rejection_note check (decision <> 'rejected' or char_length(btrim(note)) >= 10)
);

create index report_reviews_reviewer_idx on public.report_reviews (reviewer_id, created_at desc);

create or replace function public.prevent_report_review_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'report review decisions are append-only';
end;
$$;

create trigger report_reviews_append_only before update or delete on public.report_reviews
for each row execute function public.prevent_report_review_mutation();

alter table public.report_reviews enable row level security;
revoke all on public.report_reviews from anon, authenticated;
grant select on public.report_reviews to authenticated;

-- Admins read every decision; an employee reads the decisions on the reports they own.
create policy report_reviews_select on public.report_reviews for select to authenticated
using (
  public.is_active_user() and (
    public.is_admin()
    or exists (
      select 1 from public.reports r
      where r.id = report_reviews.report_id and r.created_by_employee_id = auth.uid()
    )
  )
);

-- The only write path. The reviewer is always auth.uid(), never a client-supplied id.
create or replace function public.review_report(p_report_id uuid, p_decision text, p_note text default null)
returns public.report_reviews
language plpgsql security definer set search_path = public
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

  begin
    insert into public.report_reviews (report_id, report_pdf_sha256, reviewer_id, decision, note)
    values (target.id, target.pdf_sha256, auth.uid(), p_decision, clean_note)
    returning * into saved;
  exception when unique_violation then
    raise exception 'report_already_reviewed';
  end;
  return saved;
end;
$$;

revoke execute on function public.review_report(uuid, text, text) from public, anon;
grant execute on function public.review_report(uuid, text, text) to authenticated;

commit;
