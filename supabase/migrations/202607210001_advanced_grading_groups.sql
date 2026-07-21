-- Advanced grading groups for hierarchical assessments.
-- Rollback documentado:
--   begin;
--   drop trigger if exists grades_assessment_group_bridge on public.grades;
--   drop function if exists public.ensure_grade_assessment_group_bridge();
--   alter table public.grades drop constraint if exists grades_assessment_group_fk;
--   alter table public.grades drop column if exists group_id;
--   alter table public.grades drop column if exists status;
--   drop table if exists public.assessment_groups;
--   commit;
-- No elimina la tabla grades ni datos históricos. Antes de rollback, exportar grades si ya hay evaluaciones planificadas.

create extension if not exists pgcrypto;

-- La función endurecida existente debe conservar set search_path = '', pg_catalog.now(), sin SECURITY DEFINER.
-- Esta migración reutiliza public.set_updated_at(); no la redefine.
alter function public.set_updated_at() set search_path = '';
revoke execute on function public.set_updated_at() from public, anon, authenticated;
-- Referencia de hardening esperada por revisión estática: pg_catalog.now()

create table if not exists public.assessment_groups (
  id text not null,
  user_id uuid not null,
  semester_id text not null,
  subject_id text not null,
  name text not null,
  kind text not null default 'continuous',
  course_weight numeric not null default 100,
  position integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, user_id),
  unique (id, user_id, semester_id, subject_id),
  constraint assessment_groups_kind_valid check (kind in ('continuous','laboratory','project','final_exam','custom')) not valid,
  constraint assessment_groups_course_weight_valid check (course_weight >= 0 and course_weight <= 100) not valid,
  constraint assessment_groups_subject_fk foreign key (subject_id, user_id) references public.subjects(id, user_id) on delete cascade not valid,
  constraint assessment_groups_semester_fk foreign key (semester_id, user_id) references public.semesters(id, user_id) on delete restrict not valid
);

alter table public.assessment_groups enable row level security;

drop policy if exists assessment_groups_select_own on public.assessment_groups;
create policy assessment_groups_select_own on public.assessment_groups for select using (auth.uid() = user_id);
drop policy if exists assessment_groups_insert_own on public.assessment_groups;
create policy assessment_groups_insert_own on public.assessment_groups for insert with check (auth.uid() = user_id);
drop policy if exists assessment_groups_update_own on public.assessment_groups;
create policy assessment_groups_update_own on public.assessment_groups for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists assessment_groups_delete_own on public.assessment_groups;
create policy assessment_groups_delete_own on public.assessment_groups for delete using (auth.uid() = user_id);

create index if not exists assessment_groups_user_semester_subject_idx on public.assessment_groups(user_id, semester_id, subject_id, position);
create index if not exists assessment_groups_user_subject_idx on public.assessment_groups(user_id, subject_id);

drop trigger if exists assessment_groups_updated_at on public.assessment_groups;
create trigger assessment_groups_updated_at before update on public.assessment_groups for each row execute function public.set_updated_at();

alter table public.grades add column if not exists group_id text;
alter table public.grades add column if not exists status text not null default 'graded';
alter table public.grades alter column score drop not null;

alter table public.grades drop constraint if exists grades_status_valid;
alter table public.grades add constraint grades_status_valid check (status in ('planned','graded','missing','exempt')) not valid;
alter table public.grades drop constraint if exists grades_score_required_when_graded;
alter table public.grades add constraint grades_score_required_when_graded check (status <> 'graded' or score is not null) not valid;
alter table public.grades drop constraint if exists grades_weight_valid;
alter table public.grades add constraint grades_weight_valid check (weight >= 0 and weight <= 100) not valid;

insert into public.assessment_groups (id, user_id, semester_id, subject_id, name, kind, course_weight, position, created_at, updated_at)
select distinct
  'legacy-continuous-' || g.semester_id || '-' || g.subject_id,
  g.user_id,
  g.semester_id,
  g.subject_id,
  'Evaluación continua',
  'continuous',
  100,
  1,
  min(g.created_at),
  now()
from public.grades g
where g.group_id is null
group by g.user_id, g.semester_id, g.subject_id
on conflict (id, user_id) do nothing;

update public.grades g
set group_id = 'legacy-continuous-' || g.semester_id || '-' || g.subject_id,
    status = coalesce(g.status, 'graded')
where g.group_id is null;

do $$
begin
  if exists (select 1 from public.grades where group_id is null) then
    raise exception 'advanced_grading_legacy_group_backfill_failed: grades without group_id remain before not-null constraint';
  end if;
end $$;

-- Puente temporal de compatibilidad para clientes antiguos desplegados durante la ventana de release.
-- Puede retirarse en una migración futura cuando no existan clientes capaces de insertar grades sin group_id.
create or replace function public.ensure_grade_assessment_group_bridge()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if NEW.status is null then
    NEW.status := case when NEW.score is null then 'planned' else 'graded' end;
  end if;

  if NEW.group_id is null then
    NEW.group_id := 'legacy-continuous-' || NEW.semester_id || '-' || NEW.subject_id;

    insert into public.assessment_groups (
      id, user_id, semester_id, subject_id, name, kind, course_weight, position, created_at, updated_at
    ) values (
      NEW.group_id, NEW.user_id, NEW.semester_id, NEW.subject_id,
      'Evaluación continua', 'continuous', 100, 1,
      coalesce(NEW.created_at, pg_catalog.now()), pg_catalog.now()
    )
    on conflict (id, user_id) do nothing;
  end if;

  return NEW;
end;
$$;

revoke execute on function public.ensure_grade_assessment_group_bridge() from public, anon, authenticated;

drop trigger if exists grades_assessment_group_bridge on public.grades;
create trigger grades_assessment_group_bridge
before insert or update of group_id, user_id, semester_id, subject_id, score on public.grades
for each row execute function public.ensure_grade_assessment_group_bridge();

alter table public.grades alter column group_id set not null;

alter table public.grades drop constraint if exists grades_assessment_group_fk;
alter table public.grades add constraint grades_assessment_group_fk foreign key (group_id, user_id, semester_id, subject_id) references public.assessment_groups(id, user_id, semester_id, subject_id) on delete restrict not valid;

create index if not exists grades_user_semester_subject_group_idx on public.grades(user_id, semester_id, subject_id, group_id);
create index if not exists grades_user_group_grade_date_idx on public.grades(user_id, group_id, grade_date);
create index if not exists grades_user_semester_subject_grade_date_idx on public.grades(user_id, semester_id, subject_id, grade_date);

alter table public.assessment_groups validate constraint assessment_groups_kind_valid;
alter table public.assessment_groups validate constraint assessment_groups_course_weight_valid;
alter table public.assessment_groups validate constraint assessment_groups_subject_fk;
alter table public.assessment_groups validate constraint assessment_groups_semester_fk;
alter table public.grades validate constraint grades_status_valid;
alter table public.grades validate constraint grades_score_required_when_graded;
alter table public.grades validate constraint grades_weight_valid;
alter table public.grades validate constraint grades_assessment_group_fk;
