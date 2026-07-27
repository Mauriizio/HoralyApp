# Constitución técnica de HoralyApp

Estas reglas son obligatorias para toda macrofase:

- Arquitectura por capas: `domain`, `application`, `infrastructure`, `components` y `lib/plugins`.
- La UI no importa clientes de Supabase; usa casos de uso, hooks o repositorios.
- Los repositorios son la frontera de persistencia local/cloud.
- Toda evolución cloud usa migraciones SQL versionadas, compatibles e idempotentes.
- RLS es obligatoria en tablas privadas y storage privado por usuario.
- Validar datos en fronteras: formularios, importaciones, repositorios y SQL.
- Nunca usar service role en el cliente.
- No usar `any` para esconder problemas de modelado; preferir `unknown` y tipos explícitos.
- Plugins internos con permisos mínimos, sin JavaScript remoto y sin sesión/cookies.
- Una PR principal por macrofase; no PRs satélite para correcciones menores.
- CI verde antes de merge.
- Decisiones estructurales mediante ADR.
- Cambios compatibles y migraciones idempotentes.
- Datos de invitado separados de la cuenta cloud; la sincronización debe ser explícita y reversible.

## Regla de producto: semestres visibles

La gestión visible de semestres forma parte del núcleo académico. La UI no elimina semestres en esta fase: archivar conserva historial y restaurar devuelve el semestre al flujo operativo. Solo puede existir un semestre activo y todos los datos académicos deben pertenecer a un semestre. El onboarding se puede revisar sin destruir materias, horarios, notas, recordatorios, semestres ni historial.

## Enmienda: herramientas internas empaquetadas

Las herramientas de `lib/plugins` y `plugins/` son parte del build de HoralyApp. Deben declarar manifiesto, categoría, estado, capacidades, permisos y feature flag cuando aplique. No pueden cargar JavaScript remoto, usar `eval`, iframes externos, cookies, JWT, cliente Supabase ni datos académicos fuera del contexto mínimo autorizado.

## Enmienda 2026-07-21: planificación académica avanzada

Las notas jerárquicas usan grupos por usuario, semestre y asignatura; `grades` conserva compatibilidad legacy como evaluaciones. Las proyecciones dependen de pesos válidos, el consejero académico es determinista sin servicios externos y el PDF de horario se genera localmente sin incluir correo por defecto.
