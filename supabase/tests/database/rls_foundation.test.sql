begin;
select plan(49);

select has_table('public', 'profiles');
select has_table('public', 'semesters');
select has_table('public', 'subjects');
select has_table('public', 'schedule_blocks');
select has_table('public', 'study_blocks');
select has_table('public', 'reminders');
select has_table('public', 'grades');
select has_table('public', 'user_settings');
select has_table('public', 'migration_status');
select has_index('public', 'semesters', 'semesters_one_active_per_user');
select has_index('public', 'subjects', 'subjects_user_id_idx');
select has_index('public', 'schedule_blocks', 'schedule_blocks_semester_id_idx');
select has_index('public', 'grades', 'grades_subject_id_idx');
select has_policy('public', 'subjects', 'subjects_select_own');
select has_policy('public', 'subjects', 'subjects_insert_own');
select has_policy('public', 'subjects', 'subjects_update_own');
select has_policy('public', 'subjects', 'subjects_delete_own');
select has_policy('storage', 'objects', 'avatars_insert_own');
select has_policy('storage', 'objects', 'avatars_delete_own');
select is_empty($$select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'ensure_initial_semester'$$, 'ensure_initial_semester no queda expuesta');

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@example.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@example.test')
on conflict (id) do nothing;

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);

insert into public.profiles (id, user_id, display_name) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Usuario A') on conflict (id) do update set display_name = excluded.display_name;
select lives_ok($$insert into public.semesters(id, user_id, name, status) values ('sem-a', '00000000-0000-0000-0000-0000000000a1', 'A', 'active')$$, 'A crea su semestre activo');
select lives_ok($$insert into public.subjects(id, user_id, semester_id, name, color, difficulty) values ('sub-a', '00000000-0000-0000-0000-0000000000a1', 'sem-a', 'Mate A', '#000', 3)$$, 'A inserta materia propia');
select results_eq($$select count(*)::int from public.subjects where id = 'sub-a'$$, array[1], 'A lee su materia');
select lives_ok($$update public.subjects set name = 'Mate A editada' where id = 'sub-a'$$, 'A actualiza su materia');
select results_eq($$select name from public.subjects where id = 'sub-a'$$, array['Mate A editada'], 'A ve actualización propia');
select lives_ok($$insert into public.schedule_blocks(id, user_id, semester_id, subject_id, day, module_ids) values ('block-a', '00000000-0000-0000-0000-0000000000a1', 'sem-a', 'sub-a', 'lunes', array['m1'])$$, 'A inserta bloque propio con semestre');
select lives_ok($$insert into public.study_blocks(id, user_id, semester_id, subject_id, title, day, start_time, end_time) values ('study-a', '00000000-0000-0000-0000-0000000000a1', 'sem-a', 'sub-a', 'Estudio A', 'martes', '10:00', '10:30')$$, 'A inserta bloque de estudio propio');
select lives_ok($$insert into public.reminders(id, user_id, semester_id, subject_id, study_block_id, title, priority, target_date_time) values ('rem-a', '00000000-0000-0000-0000-0000000000a1', 'sem-a', 'sub-a', 'study-a', 'Entrega A', 'media', '2026-07-21T10:00:00.000Z')$$, 'A inserta recordatorio propio');
select lives_ok($$insert into public.grades(id, user_id, semester_id, subject_id, title, score, weight, grade_date) values ('grade-a', '00000000-0000-0000-0000-0000000000a1', 'sem-a', 'sub-a', 'P1', 5, 50, '2026-07-20')$$, 'A inserta nota propia');
select lives_ok($$delete from public.subjects where id = 'sub-a'$$, 'A elimina su materia sin borrar el bloque de estudio');
select results_eq($$select count(*)::int from public.study_blocks where id = 'study-a'$$, array[1], 'El bloque de estudio sobrevive a la eliminación de la materia');
select results_eq($$select subject_id from public.study_blocks where id = 'study-a'$$, array[null::text], 'Solo subject_id queda NULL en el bloque de estudio');
select results_eq($$select user_id from public.study_blocks where id = 'study-a'$$, array['00000000-0000-0000-0000-0000000000a1'::uuid], 'user_id se conserva en el bloque de estudio');

select throws_ok($$insert into public.subjects(id, user_id, semester_id, name, color, difficulty) values ('sub-bad-user', '00000000-0000-0000-0000-0000000000b2', 'sem-a', 'Bad', '#000', 3)$$, null, null, 'A no inserta con user_id de B');
select throws_ok($$insert into public.semesters(id, user_id, name, status) values ('sem-a-2', '00000000-0000-0000-0000-0000000000a1', 'A2', 'active')$$, null, null, 'A no puede crear dos semestres activos');
select throws_ok($$insert into public.profiles (id, user_id, display_name) values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', 'Perfil cruzado')$$, null, null, 'profile debe corresponder al usuario autenticado');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', true);
insert into public.profiles (id, user_id, display_name) values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000b2', 'Usuario B') on conflict (id) do update set display_name = excluded.display_name;
select lives_ok($$insert into public.semesters(id, user_id, name, status) values ('sem-b', '00000000-0000-0000-0000-0000000000b2', 'B', 'active')$$, 'B crea semestre activo');
select lives_ok($$insert into public.subjects(id, user_id, semester_id, name, color, difficulty) values ('sub-b', '00000000-0000-0000-0000-0000000000b2', 'sem-b', 'Mate B', '#111', 3)$$, 'B inserta materia propia');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select results_eq($$select count(*)::int from public.subjects where id = 'sub-b'$$, array[0], 'A no lee datos de B');
select lives_ok($$update public.subjects set name = 'Nope' where id = 'sub-b'$$, 'UPDATE de A contra B no rompe');
select results_eq($$select count(*)::int from public.subjects where id = 'sub-b' and name = 'Nope'$$, array[0], 'A no actualiza filas de B');
select lives_ok($$delete from public.subjects where id = 'sub-b'$$, 'DELETE de A contra B no rompe');
select results_eq($$select count(*)::int from public.subjects where id = 'sub-b'$$, array[0], 'A sigue sin ver filas de B');
select throws_ok($$insert into public.subjects(id, user_id, semester_id, name, color, difficulty) values ('sub-cross-semester', '00000000-0000-0000-0000-0000000000a1', 'sem-b', 'Cruce', '#000', 3)$$, null, null, 'A no asocia entidad al semestre de B');

select lives_ok($$insert into storage.objects(bucket_id, name, owner, metadata) values ('avatars', '00000000-0000-0000-0000-0000000000a1/avatar.png', '00000000-0000-0000-0000-0000000000a1', '{}')$$, 'A escribe avatar en su carpeta');
select throws_ok($$insert into storage.objects(bucket_id, name, owner, metadata) values ('avatars', '00000000-0000-0000-0000-0000000000b2/avatar.png', '00000000-0000-0000-0000-0000000000a1', '{}')$$, null, null, 'A no escribe avatar en carpeta B');
select lives_ok($$update storage.objects set metadata = '{"ok":true}' where bucket_id = 'avatars' and name = '00000000-0000-0000-0000-0000000000b2/avatar.png'$$, 'UPDATE avatar B no rompe');
select is_empty($$select 1 from storage.objects where bucket_id = 'avatars' and name = '00000000-0000-0000-0000-0000000000b2/avatar.png' and metadata = '{"ok":true}'$$, 'A no actualiza avatar de B');
select lives_ok($$delete from storage.objects where bucket_id = 'avatars' and name = '00000000-0000-0000-0000-0000000000b2/avatar.png'$$, 'DELETE avatar B no rompe');

select set_config('request.jwt.claim.role', 'anon', true);
select set_config('role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);
select results_eq($$select count(*)::int from public.subjects$$, array[0], 'Anónimo no lee tablas privadas');
select throws_ok($$insert into public.semesters(id, user_id, name, status) values ('sem-anon', '00000000-0000-0000-0000-0000000000a1', 'Anon', 'planned')$$, null, null, 'Anónimo no escribe tablas privadas');

select * from finish();
rollback;
