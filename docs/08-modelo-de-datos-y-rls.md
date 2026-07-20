# Modelo de datos y RLS

Tablas privadas creadas:
- `profiles`
- `semesters`
- `subjects`
- `schedule_blocks`
- `study_blocks`
- `reminders`
- `grades`
- `user_settings`
- `migration_status`

Todas incluyen `id`, `user_id`, `created_at`, `updated_at`. Las tablas académicas aceptan `semester_id` y/o `subject_id` cuando corresponde. `grades` conserva el modelo actual de HoralyApp sin separar evaluaciones.

RLS está habilitado en todas las tablas privadas. Las políticas CRUD usan `auth.uid() = user_id`; `profiles` exige además `id = user_id`.

Prueba manual recomendada:
1. Crear dos usuarios.
2. Insertar materias con cada usuario.
3. Consultar `subjects` autenticado como usuario A.
4. Confirmar que no aparecen filas del usuario B.
5. Intentar `update`/`delete` sobre filas de B y verificar que no afecta filas.
