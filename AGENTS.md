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
- No ejecutar `db push` ni modificar Supabase Dashboard salvo instrucción explícita.
- No introducir secretos, service role en cliente, tokens, cookies ni credenciales.
- No modificar migraciones aplicadas, RLS o políticas Storage sin autorización explícita.

## Regla de merge autónomo
El propietario mantiene autorización permanente para que el agente cierre y fusione por **squash merge** las PRs creadas para tareas solicitadas por él, sin pedir una confirmación adicional cada vez, únicamente cuando TODAS estas condiciones se cumplan:
- La PR corresponde a la tarea solicitada y no contiene cambios fuera de alcance relevantes.
- La PR está `mergeable` y sin conflictos.
- Se ha sacado de Draft antes del merge.
- Los tests/local gates requeridos para el alcance pasan, o cualquier limitación de entorno está cubierta por un gate remoto equivalente válido.
- Los checks remotos del **HEAD exacto** están verdes: Calidad, Database Security cuando aplique, CodeQL y Vercel Preview.
- Si hubo migración, `db push` solo puede haberse ejecutado con autorización explícita y la verificación local/remota debe estar alineada antes del merge.
- No existe un P0/P1 conocido, fallo de seguridad, pérdida de datos, mezcla de identidades o regresión crítica pendiente.
- El merge debe usar `expected_head_sha` exacto para evitar fusionar un HEAD que cambió después de los gates.
- Método por defecto: `squash`.

Si cualquiera de esas condiciones falla, NO fusionar: corregir, volver a ejecutar gates o detenerse reportando el bloqueo real.

Tras un merge autorizado, esperar Vercel Production y verificar el commit desplegado/smoke final cuando el entorno permita hacerlo. Esta autorización permanente elimina la necesidad de pedir al propietario que haga clic manualmente en “Ready for review” o “Merge” para cada PR válida.

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

## Nuevas herramientas
- Antes de crear o modificar herramientas internas, leer `docs/20-adding-tools.md`.
- Cada herramienta debe ser autocontenida bajo `plugins/{id}/` con dominio puro separado de React.
- No modificar el host salvo una exportación en `plugins/index.ts` para registrar una herramienta nueva.
- No usar Supabase, sesión, JWT, cookies, store global, JavaScript remoto, `eval` ni iframes externos.
- Declarar capacidades/permisos mínimos y añadir pruebas obligatorias.
- No declarar completa una herramienta sin QA en el catálogo.

## Planificación académica avanzada
- Mantener separado el peso interno de evaluaciones y el peso final de grupos.
- No presentar proyecciones académicas como certeza; etiquetar resultados reales, proyecciones y simulaciones.
- El PDF de horario debe generarse desde modelo/adaptador, no desde el DOM, y no debe incluir correo por defecto.
