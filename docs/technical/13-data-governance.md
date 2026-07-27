# Gobierno de datos

- El modo invitado persiste en `localStorage` y no mezcla datos con cloud.
- El modo autenticado usa Supabase mediante repositorios.
- Migraciones cloud son versionadas e idempotentes.
- Datos legacy sin semestre se asignan a un semestre inicial seguro.
- Borrados deben tener comportamiento `ON DELETE` explícito.
- No se almacenan secretos en el repositorio ni en datos exportados.

## Gobierno de datos por semestre

Todos los datos académicos operativos pertenecen a un `semester_id`. La aplicación puede conservar datos de todos los semestres internamente, pero las vistas de Dashboard, Horario, Materias, Estudio, Recordatorios, Notas, contadores y consola Horarily deben consumir únicamente el semestre activo. Los semestres no se eliminan desde la UI durante esta fase; archivar oculta el semestre del selector principal y conserva el historial para restauración posterior.

## Enmienda 2026-07-21: planificación académica avanzada
Las notas jerárquicas usan grupos por usuario, semestre y asignatura; `grades` conserva compatibilidad legacy como evaluaciones. Las proyecciones dependen de pesos válidos, el consejero académico es determinista sin servicios externos y el PDF de horario se genera localmente sin incluir correo por defecto.
