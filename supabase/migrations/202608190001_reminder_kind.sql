alter table public.reminders
  add column if not exists reminder_kind text not null default 'general';

alter table public.reminders
  drop constraint if exists reminders_kind_valid;

alter table public.reminders
  add constraint reminders_kind_valid
  check (reminder_kind in ('general', 'assessment', 'assignment', 'event')) not valid;

alter table public.reminders validate constraint reminders_kind_valid;
