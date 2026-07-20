-- Foundation hardening: semesters, onboarding, constraints, indexes, RLS and avatars policy guardrails.
create extension if not exists pgcrypto;

alter table public.profiles add column if not exists institution text;
alter table public.profiles add column if not exists career text;
alter table public.profiles add column if not exists timezone text;
alter table public.profiles add column if not exists onboarding_completed_at timestamptz;
alter table public.profiles add constraint profiles_institution_len check (institution is null or char_length(institution) <= 120) not valid;
alter table public.profiles add constraint profiles_career_len check (career is null or char_length(career) <= 120) not valid;

alter table public.semesters add column if not exists status text not null default 'planned';
alter table public.semesters add constraint semesters_status_valid check (status in ('planned','active','archived')) not valid;
alter table public.semesters add constraint semesters_dates_valid check (starts_on is null or ends_on is null or starts_on <= ends_on) not valid;
create unique index if not exists semesters_one_active_per_user on public.semesters(user_id) where status = 'active';
create index if not exists semesters_user_id_idx on public.semesters(user_id);

create or replace function public.ensure_initial_semester(target_user uuid) returns text language plpgsql security definer set search_path = public as $$
declare semester text;
begin
  select id into semester from public.semesters where user_id = target_user order by created_at asc limit 1;
  if semester is null then
    semester := 'initial-semester';
    insert into public.semesters(id, user_id, name, status) values (semester, target_user, 'Semestre inicial', 'active') on conflict do nothing;
  end if;
  return semester;
end; $$;

do $$ declare u uuid; s text; begin
  for u in select distinct user_id from public.subjects union select distinct user_id from public.schedule_blocks union select distinct user_id from public.study_blocks union select distinct user_id from public.reminders union select distinct user_id from public.grades loop
    s := public.ensure_initial_semester(u);
    update public.subjects set semester_id = coalesce(semester_id, s) where user_id = u;
    update public.schedule_blocks set semester_id = coalesce(semester_id, s) where user_id = u;
    update public.study_blocks set semester_id = coalesce(semester_id, s) where user_id = u;
    update public.reminders set semester_id = coalesce(semester_id, s) where user_id = u;
    update public.grades set semester_id = coalesce(semester_id, s) where user_id = u;
  end loop;
end $$;

alter table public.subjects add constraint subjects_difficulty_valid check (difficulty between 1 and 5) not valid;
alter table public.schedule_blocks add constraint schedule_blocks_day_valid check (day in ('lunes','martes','miercoles','jueves','viernes','sabado','domingo')) not valid;
alter table public.study_blocks add constraint study_blocks_day_valid check (day in ('lunes','martes','miercoles','jueves','viernes','sabado','domingo')) not valid;
alter table public.study_blocks add constraint study_blocks_time_valid check (start_time < end_time) not valid;
alter table public.reminders add constraint reminders_priority_valid check (priority in ('baja','media','alta')) not valid;
alter table public.grades add constraint grades_weight_valid check (weight > 0 and weight <= 100) not valid;

create unique index if not exists subjects_user_semester_command_key_idx on public.subjects(user_id, semester_id, upper(command_key)) where command_key is not null;
create index if not exists subjects_user_id_idx on public.subjects(user_id);
create index if not exists subjects_semester_id_idx on public.subjects(user_id, semester_id);
create index if not exists schedule_blocks_user_id_idx on public.schedule_blocks(user_id);
create index if not exists schedule_blocks_semester_id_idx on public.schedule_blocks(user_id, semester_id);
create index if not exists schedule_blocks_subject_id_idx on public.schedule_blocks(user_id, subject_id);
create index if not exists study_blocks_user_id_idx on public.study_blocks(user_id);
create index if not exists study_blocks_subject_id_idx on public.study_blocks(user_id, subject_id);
create index if not exists reminders_user_id_idx on public.reminders(user_id);
create index if not exists reminders_subject_id_idx on public.reminders(user_id, subject_id);
create index if not exists grades_user_id_idx on public.grades(user_id);
create index if not exists grades_subject_id_idx on public.grades(user_id, subject_id);
create index if not exists migration_status_user_id_idx on public.migration_status(user_id);

alter table public.subjects drop constraint if exists subjects_semester_fk;
alter table public.subjects add constraint subjects_semester_fk foreign key (semester_id, user_id) references public.semesters(id, user_id) on delete restrict not valid;
alter table public.schedule_blocks drop constraint if exists schedule_blocks_subject_fk;
alter table public.schedule_blocks add constraint schedule_blocks_subject_fk foreign key (subject_id, user_id) references public.subjects(id, user_id) on delete cascade not valid;
alter table public.study_blocks drop constraint if exists study_blocks_subject_fk;
alter table public.study_blocks add constraint study_blocks_subject_fk foreign key (subject_id, user_id) references public.subjects(id, user_id) on delete set null not valid;
alter table public.reminders drop constraint if exists reminders_subject_fk;
alter table public.reminders add constraint reminders_subject_fk foreign key (subject_id, user_id) references public.subjects(id, user_id) on delete cascade not valid;
alter table public.grades drop constraint if exists grades_subject_fk;
alter table public.grades add constraint grades_subject_fk foreign key (subject_id, user_id) references public.subjects(id, user_id) on delete cascade not valid;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
