begin;
select plan(18);

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
select has_index('public', 'grades', 'grades_subject_id_idx');
select has_policy('public', 'subjects', 'subjects_select_own');
select has_policy('public', 'subjects', 'subjects_insert_own');
select has_policy('public', 'subjects', 'subjects_update_own');
select has_policy('public', 'subjects', 'subjects_delete_own');
select has_policy('storage', 'objects', 'avatars_insert_own');
select has_policy('storage', 'objects', 'avatars_delete_own');

select * from finish();
rollback;
