# AGENTS.md — HoralyApp

## Leer antes de modificar
Antes de editar código, revisar:
- `docs/10-project-constitution.md`
- `docs/11-security-architecture.md`
- `docs/13-data-governance.md`
- `docs/14-release-process.md`
- `docs/18-avatar-consistency.md`

## Regla de regresión
Para bugs confirmados:
1. Reproducir el fallo o modelarlo con mocks.
2. Escribir una prueba que falle con el código actual.
3. Implementar el cambio mínimo seguro.
4. Confirmar que esa misma prueba pasa junto con la suite existente.

## Regla de identidad
- Ninguna operación cloud puede ejecutarse sin un `userId` esperado.
- Auth, Repository, Store y Storage deben coincidir antes y después de cada `await` sensible.
- La igualdad obligatoria es: `authUserId = verifiedUserId = repositoryOwnerUserId = dataOwnerUserId = storageFolderUserId`.
- Ante duda, cambio de sesión o transición, bloquear la UI y abortar operaciones.
- Nunca reutilizar datos visibles, caché, repositorios o carpetas Storage de otra cuenta.

## Regla de evidencia
- No afirmar CI, CodeQL, Vercel, remote SHA ni PR remota sin evidencia remota.
- No afirmar pruebas SQL ejecutadas si solo se hicieron checks estáticos.
- No declarar completo un flujo sensible sin QA manual del flujo afectado.

## Regla de alcance
- Una rama y una PR por tarea.
- No hacer merge desde el entorno de agente.
- No ejecutar `db push` ni modificar Supabase Dashboard salvo instrucción explícita.
- No introducir secretos, service role en cliente, tokens, cookies ni credenciales.
- No modificar migraciones aplicadas, RLS o políticas Storage sin autorización explícita.

## Regla multicuenta
- QA A/B manual debe usar incógnito o perfiles de navegador separados.
- Dos pestañas normales del mismo origen no representan sesiones independientes.
- Aun con eventos de sesión del mismo origen, la app debe bloquear transición y jamás mezclar estados.

## Validación esperada
Cuando se modifique código, intentar ejecutar:
- `pnpm install --frozen-lockfile`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm check`

Reportar limitaciones del entorno sin ocultar fallos.
