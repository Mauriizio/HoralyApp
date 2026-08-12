insert into auth.users (id, email)
values ('00000000-0000-0000-0000-0000000000c3', 'legacy-note@example.test');

insert into public.semesters (id, user_id, name, status)
values (
  'legacy-semester',
  '00000000-0000-0000-0000-0000000000c3',
  'Legacy semester',
  'active'
);

insert into public.subjects (id, user_id, semester_id, name, color, difficulty)
values (
  'legacy-subject',
  '00000000-0000-0000-0000-0000000000c3',
  'legacy-semester',
  'Legacy subject',
  '#334155',
  3
);

insert into public.subject_notes (
  id,
  user_id,
  semester_id,
  subject_id,
  title,
  content
)
values (
  'legacy-note',
  '00000000-0000-0000-0000-0000000000c3',
  'legacy-semester',
  'legacy-subject',
  'Legacy title',
  'Legacy plain text'
);
