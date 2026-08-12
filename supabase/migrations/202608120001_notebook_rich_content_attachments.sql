-- Additive rich notebook documents and private attachments. Safe for older clients.
alter table public.subject_notes add column if not exists document jsonb;

update public.subject_notes
set document = jsonb_build_object(
  'version', 1,
  'blocks', jsonb_build_array(jsonb_build_object(
    'id', 'legacy-' || id::text,
    'type', 'paragraph',
    'content', jsonb_build_array(jsonb_build_object('text', content))
  ))
)
where document is null;

create table if not exists public.subject_note_attachments (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id text not null,
  subject_id text not null,
  note_id text not null,
  kind text not null check (kind in ('image', 'pdf', 'drawing')),
  storage_path text not null,
  filename text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  size_bytes bigint not null check (size_bytes >= 0),
  width integer,
  height integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  constraint subject_note_attachments_note_owner_fk foreign key (note_id, user_id)
    references public.subject_notes(id, user_id) on delete cascade,
  constraint subject_note_attachments_subject_owner_fk foreign key (subject_id, user_id)
    references public.subjects(id, user_id) on delete cascade,
  constraint subject_note_attachments_semester_owner_fk foreign key (semester_id, user_id)
    references public.semesters(id, user_id) on delete cascade
);

create index if not exists subject_note_attachments_note_idx on public.subject_note_attachments(user_id, note_id, created_at);
alter table public.subject_note_attachments enable row level security;
drop policy if exists subject_note_attachments_select_own on public.subject_note_attachments;
create policy subject_note_attachments_select_own on public.subject_note_attachments for select using (auth.uid() = user_id);
drop policy if exists subject_note_attachments_insert_own on public.subject_note_attachments;
create policy subject_note_attachments_insert_own on public.subject_note_attachments for insert with check (auth.uid() = user_id);
drop policy if exists subject_note_attachments_update_own on public.subject_note_attachments;
create policy subject_note_attachments_update_own on public.subject_note_attachments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists subject_note_attachments_delete_own on public.subject_note_attachments;
create policy subject_note_attachments_delete_own on public.subject_note_attachments for delete using (auth.uid() = user_id);
grant select, insert, update, delete on public.subject_note_attachments to authenticated;
revoke all on public.subject_note_attachments from anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('subject-note-files', 'subject-note-files', false, 15728640, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists subject_note_files_select_own on storage.objects;
create policy subject_note_files_select_own on storage.objects for select to authenticated
using (bucket_id = 'subject-note-files' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists subject_note_files_insert_own on storage.objects;
create policy subject_note_files_insert_own on storage.objects for insert to authenticated
with check (bucket_id = 'subject-note-files' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists subject_note_files_update_own on storage.objects;
create policy subject_note_files_update_own on storage.objects for update to authenticated
using (bucket_id = 'subject-note-files' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'subject-note-files' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists subject_note_files_delete_own on storage.objects;
create policy subject_note_files_delete_own on storage.objects for delete to authenticated
using (bucket_id = 'subject-note-files' and (storage.foldername(name))[1] = auth.uid()::text);
