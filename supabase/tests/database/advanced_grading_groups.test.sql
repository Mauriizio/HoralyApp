begin;
select plan(6);

select has_table('public', 'assessment_groups', 'assessment_groups existe');
select policies_are('public', 'assessment_groups', array['assessment_groups_select_own','assessment_groups_insert_own','assessment_groups_update_own','assessment_groups_delete_own'], 'RLS CRUD propio definido');
select col_is_fk('public', 'grades', 'group_id', 'grades.group_id referencia grupos');
select has_check('public', 'grades', 'grades_status_valid', 'status válido');
select has_check('public', 'grades', 'grades_score_required_when_graded', 'graded requiere score');
select function_privs_are('public', 'set_updated_at', array[]::text[], 'execute', array[]::text[], 'set_updated_at sin execute público');

select * from finish();
rollback;
