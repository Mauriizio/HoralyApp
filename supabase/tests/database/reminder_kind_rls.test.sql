begin;
select plan(9);
select has_column('public', 'reminders', 'reminder_kind');
select col_default_is('public', 'reminders', 'reminder_kind', '''general''::text');

insert into auth.users(id, email) values
 ('00000000-0000-0000-0000-0000000000a1', 'kind-a@example.test'),
 ('00000000-0000-0000-0000-0000000000b2', 'kind-b@example.test') on conflict do nothing;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
insert into public.semesters(id,user_id,name,status) values ('kind-sem-a','00000000-0000-0000-0000-0000000000a1','A','active') on conflict do nothing;
select lives_ok($$insert into public.reminders(id,user_id,semester_id,title,priority,target_date_time,reminder_kind) values ('kind-rem-a','00000000-0000-0000-0000-0000000000a1','kind-sem-a','Prueba','alta','2026-09-08T08:00:00Z','assessment')$$, 'A crea evaluación');
select results_eq($$select reminder_kind from public.reminders where id='kind-rem-a'$$, array['assessment'], 'A lee tipo propio');
select throws_ok($$insert into public.reminders(id,user_id,semester_id,title,priority,target_date_time,reminder_kind) values ('kind-invalid','00000000-0000-0000-0000-0000000000a1','kind-sem-a','X','media','2026-09-08T08:00:00Z','other')$$, null, null, 'CHECK rechaza tipo inválido');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', true);
select results_eq($$select count(*)::int from public.reminders where id='kind-rem-a'$$, array[0], 'B no lee reminder de A');
select lives_ok($$update public.reminders set reminder_kind='event' where id='kind-rem-a'$$, 'UPDATE cruzado no filtra error');
select set_config('request.jwt.claim.role', 'anon', true);
set local role anon;
select results_eq($$select count(*)::int from public.reminders$$, array[0], 'Anon no lee reminders');
select throws_ok($$insert into public.reminders(id,user_id,semester_id,title,priority,target_date_time) values ('kind-anon','00000000-0000-0000-0000-0000000000a1','kind-sem-a','X','media','2026-09-08T08:00:00Z')$$, null, null, 'Anon no crea reminders');
select * from finish();
rollback;
