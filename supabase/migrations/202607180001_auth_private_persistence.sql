-- HoralyApp private persistence. All private tables enable RLS and require auth.uid() = user_id.
create extension if not exists pgcrypto;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null default '',
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_user_match check (id = user_id),
  constraint profiles_display_name_safe check (char_length(display_name) <= 80)
);

create table if not exists public.semesters (id text not null, user_id uuid not null references auth.users(id) on delete cascade, name text not null, starts_on date, ends_on date, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key(id,user_id));
create table if not exists public.subjects (id text not null, user_id uuid not null references auth.users(id) on delete cascade, semester_id text, name text not null, color text not null, icon text, notes text, command_key text, difficulty integer not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key(id,user_id));
create table if not exists public.schedule_blocks (id text not null, user_id uuid not null references auth.users(id) on delete cascade, semester_id text, subject_id text not null, day text not null, module_ids text[] not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key(id,user_id));
create table if not exists public.study_blocks (id text not null, user_id uuid not null references auth.users(id) on delete cascade, semester_id text, subject_id text, title text not null, day text not null, start_time text not null, end_time text not null, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key(id,user_id));
create table if not exists public.reminders (id text not null, user_id uuid not null references auth.users(id) on delete cascade, semester_id text, subject_id text, study_block_id text, title text not null, description text, priority text not null, triggers jsonb not null default '[]', target_date_time text not null, notified_trigger_indexes integer[] not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key(id,user_id));
create table if not exists public.grades (id text not null, user_id uuid not null references auth.users(id) on delete cascade, semester_id text, subject_id text not null, title text not null, score numeric not null, weight numeric not null, grade_date text not null, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key(id,user_id));
create table if not exists public.user_settings (id text not null default 'settings', user_id uuid not null references auth.users(id) on delete cascade, settings jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key(id,user_id));
create table if not exists public.migration_status (id text not null default 'localstorage-v1', user_id uuid not null references auth.users(id) on delete cascade, source text not null default 'localStorage', completed_at timestamptz, summary jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key(id,user_id));

alter table public.profiles enable row level security;
alter table public.semesters enable row level security;
alter table public.subjects enable row level security;
alter table public.schedule_blocks enable row level security;
alter table public.study_blocks enable row level security;
alter table public.reminders enable row level security;
alter table public.grades enable row level security;
alter table public.user_settings enable row level security;
alter table public.migration_status enable row level security;

create or replace function public.handle_new_user_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, user_id, email, display_name)
  values (new.id, new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end; $$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users for each row execute function public.handle_new_user_profile();

do $$ declare t text; begin
  foreach t in array array['profiles','semesters','subjects','schedule_blocks','study_blocks','reminders','grades','user_settings','migration_status'] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;


-- Policy documentation: every CRUD policy below restricts rows to the authenticated owner with auth.uid() = user_id.
do $$ declare t text; begin
  foreach t in array array['semesters','subjects','schedule_blocks','study_blocks','reminders','grades','user_settings','migration_status'] loop
    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format('create policy %I on public.%I for select using (auth.uid() = user_id)', t || '_select_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format('create policy %I on public.%I for insert with check (auth.uid() = user_id)', t || '_insert_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format('create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t || '_update_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);
    execute format('create policy %I on public.%I for delete using (auth.uid() = user_id)', t || '_delete_own', t);
  end loop;
end $$;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth.uid() = user_id and id = user_id);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = user_id and id = user_id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (auth.uid() = user_id and id = user_id) with check (auth.uid() = user_id and id = user_id);
drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles for delete using (auth.uid() = user_id and id = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_select_public on storage.objects;
create policy avatars_select_public on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]) with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
