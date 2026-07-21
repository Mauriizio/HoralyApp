begin;
select plan(10);

select has_table('public', 'assessment_groups', 'assessment_groups existe');
select policies_are('public', 'assessment_groups', array['assessment_groups_select_own','assessment_groups_insert_own','assessment_groups_update_own','assessment_groups_delete_own'], 'RLS CRUD propio definido');
select col_is_fk('public', 'grades', 'group_id', 'grades.group_id referencia grupos');
select has_check('public', 'grades', 'grades_status_valid', 'status válido');
select has_check('public', 'grades', 'grades_score_required_when_graded', 'graded requiere score');
select function_privs_are('public', 'set_updated_at', array[]::text[], 'execute', array[]::text[], 'set_updated_at sin execute público');
select has_function('public', 'ensure_grade_assessment_group_bridge', array[]::name[], 'bridge legacy existe');
select function_privs_are('public', 'ensure_grade_assessment_group_bridge', array[]::text[], 'execute', array[]::text[], 'bridge sin execute público');
select has_trigger('public', 'grades', 'grades_assessment_group_bridge', 'grades tiene bridge before insert/update');
select results_eq(
  $$select count(*)::integer from information_schema.table_constraints where table_schema = 'public' and table_name = 'assessment_groups' and constraint_type = 'UNIQUE' and constraint_name in (select constraint_name from information_schema.key_column_usage where table_schema = 'public' and table_name = 'assessment_groups' and column_name = 'subject_id')$$,
  array[1],
  'assessment_groups expone unique compatible con usuario/semestre/materia'
);

select * from finish();
rollback;
