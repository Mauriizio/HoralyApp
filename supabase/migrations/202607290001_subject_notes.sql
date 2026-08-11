-- Subject notebook: normalized private notes owned by one authenticated user.

create table if not exists public.subject_notes (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id text not null,
  subject_id text not null,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  unit text check (unit is null or char_length(unit) <= 200),
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, user_id),
  constraint subject_notes_semester_fk foreign key (semester_id, user_id)
    references public.semesters(id, user_id) on delete restrict,
  constraint subject_notes_subject_fk foreign key (subject_id, user_id)
    references public.subjects(id, user_id) on delete cascade
);

create index if not exists subject_notes_user_id_idx on public.subject_notes(user_id);
create index if not exists subject_notes_subject_id_idx on public.subject_notes(user_id, subject_id);
create index if not exists subject_notes_semester_id_idx on public.subject_notes(user_id, semester_id);
create index if not exists subject_notes_updated_at_idx on public.subject_notes(user_id, updated_at desc);

alter table public.subject_notes enable row level security;

drop policy if exists subject_notes_select_own on public.subject_notes;
create policy subject_notes_select_own on public.subject_notes for select using (auth.uid() = user_id);
drop policy if exists subject_notes_insert_own on public.subject_notes;
create policy subject_notes_insert_own on public.subject_notes for insert with check (auth.uid() = user_id);
drop policy if exists subject_notes_update_own on public.subject_notes;
create policy subject_notes_update_own on public.subject_notes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists subject_notes_delete_own on public.subject_notes;
create policy subject_notes_delete_own on public.subject_notes for delete using (auth.uid() = user_id);

drop trigger if exists subject_notes_set_updated_at on public.subject_notes;
create trigger subject_notes_set_updated_at before update on public.subject_notes
for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.subject_notes to authenticated;
revoke all on public.subject_notes from anon;
