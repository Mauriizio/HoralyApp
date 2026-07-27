# HoralyApp

HoralyApp es una aplicación web académica para organizar materias, horario semanal, bloques de estudio, recordatorios, notas y analítica básica con el asistente local Horarily.

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Radix/shadcn
- Recharts
- pnpm
- `node:test` para pruebas unitarias ligeras sin dependencia adicional

## Instalación

```bash
pnpm install --frozen-lockfile
pnpm dev
```

## Variables de entorno actuales

No hay variables de entorno obligatorias para la línea base actual. Los datos se guardan localmente en el navegador con `localStorage`.

## Comandos

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

`pnpm check` ejecuta typecheck, tests y build.

## Estructura del repositorio

- `app/`: layout y página principal.
- `components/`: UI, paneles funcionales, formularios y asistente Horarily.
- `hooks/`: estado cliente, PWA e interacción de Horarily.
- `lib/`: tipos, almacenamiento, i18n, notificaciones, notas y reglas puras.
- `public/`: manifest, service worker, iconos y assets estáticos.
- `docs/`: auditoría, arquitectura, plan MVP, backlog, riesgos y decisiones.
- `test/`: pruebas unitarias críticas.

## Estado del proyecto

La línea base actual es local-first. No integra Supabase, IA externa, pagos, red social ni plugins externos. El objetivo de esta fase es estabilizar el MVP inicial y documentar el camino de arquitectura.

## Limitaciones conocidas

- Los datos viven en `localStorage`; todavía no hay base de datos privada por usuario.
- Los recordatorios usan notificaciones locales del navegador y funcionan de manera fiable solo con la aplicación abierta o activa. No existe Web Push remoto ni scheduler de backend, por lo que la aplicación cerrada no garantiza ejecución de recordatorios.
- La escala de notas es global en la línea base; la arquitectura objetivo tendrá escala por semestre.
- La PWA usa caché conservadora para shell y navegación básica offline.
- ESLint real para TypeScript/React está diferido como deuda técnica P1; la línea base se valida actualmente con typecheck, tests y build.

## Verificaciones

Antes de abrir o fusionar un PR ejecutar:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

## Supabase, autenticación y persistencia

La app puede funcionar en modo invitado/local sin variables de Supabase. Para activar cuentas, configura `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, ejecuta las migraciones en `supabase/migrations/` y revisa las guías:

- `docs/06-supabase-setup.md`
- `docs/07-auth-y-sesiones.md`
- `docs/08-modelo-de-datos-y-rls.md`
- `docs/09-migracion-localstorage.md`

Nunca expongas `SUPABASE_SERVICE_ROLE_KEY` en el cliente ni en variables públicas.

## UX de autenticación y URLs públicas

Horaly mantiene el modo invitado cuando Supabase no está configurado, pero en producción usa `NEXT_PUBLIC_SITE_URL` como origen público para enlaces de confirmación, recuperación y metadata. En Vercel configura `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `NEXT_PUBLIC_SITE_URL` para Production y Preview; `NEXT_PUBLIC_SUPABASE_ANON_KEY` queda solo como compatibilidad.

Flujos manuales recomendados con dos usuarios:
1. Registrar usuario A y verificar que la pantalla indique que la cuenta queda pendiente de confirmación, con correo enmascarado y opción de reenvío tras cooldown.
2. Intentar iniciar sesión con usuario A sin confirmar y comprobar el aviso accionable de correo no confirmado.
3. Confirmar el correo desde el enlace recibido y validar que el callback no redirige a URLs externas.
4. Registrar/iniciar sesión con usuario B, crear datos privados y comprobar que no aparecen para usuario A.
5. Solicitar recuperación de contraseña, verificar la vista “Revisa tu correo para continuar” y completar `/auth/update-password` antes de que expire el enlace.

Si un enlace expira o ya fue usado, solicita uno nuevo desde recuperación o desde el reenvío de confirmación; la app muestra `/auth/status` con acciones seguras.

## Macrofase foundation onboarding dashboard

Esta rama introduce la constitución técnica, hardening base, onboarding, semestre activo, dashboard académico, motor determinista y contrato de plugins internos.

### Validación local

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

### Pruebas SQL/RLS

Con Docker y Supabase CLI disponibles:

```bash
pnpm supabase test db
# o
supabase test db
```

### Seguridad manual recomendada

Activar branch protection en `main`, required reviews, Dependabot alerts, secret scanning y bloqueo de force push. Ejecutar Supabase Security Advisor antes de merge.

## Gestión visible de semestres y onboarding

HoralyApp permite gestionar semestres académicos desde Preferencias sin modificar migraciones ni borrar datos históricos. En esta fase los semestres nunca se eliminan desde la UI: se pueden crear, editar, activar, archivar y restaurar. Solo un semestre puede estar activo a la vez; materias, horarios, bloques de estudio, recordatorios y notas pertenecen a un semestre y las vistas principales consumen únicamente el semestre activo.

Archivar un semestre lo oculta del selector principal, pero conserva materias, notas, horario e historial. Un semestre archivado puede restaurarse como planificado y luego activarse. El onboarding académico puede abrirse nuevamente desde Preferencias para revisar o completar institución, carrera, zona horaria y semestre activo sin reiniciar datos ni crear duplicados automáticamente.

## Auth UX y herramientas

La cabecera pública usa una única fuente de acciones de invitado para iniciar sesión o crear cuenta. Las pantallas Auth tienen salida segura a Horaly y el callback filtra redirects externos. Google OAuth puede activarse con `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` configurando manualmente Google/Supabase sin versionar secretos.

La pestaña Herramientas incluye un catálogo interno con categorías, búsqueda y error boundary por herramienta. La primera herramienta disponible es el código de colores de resistencias, con cálculo de 4, 5 y 6 bandas en ambos sentidos.

### Herramientas autocontenidas

Las herramientas internas se integran como módulos bajo `plugins/{id}/` y el host no conoce sus implementaciones. Para agregar una herramienta nueva: copiar la carpeta del módulo, registrar una entrada en `plugins/index.ts` y ejecutar `pnpm typecheck`, `pnpm test`, `pnpm build` y `pnpm check`. La guía completa está en `docs/20-adding-tools.md`.

## Planificación académica avanzada

Horaly soporta un dominio jerárquico de notas con grupos (`AssessmentGroup`) y evaluaciones (`Assessment`). El peso dentro de una etapa se mantiene separado del peso final del ramo; el peso efectivo se calcula como `courseWeight × weightWithinGroup / 100`. El preset 60/40 calcula presentación y transversal necesario sin redondeos prematuros.

La arquitectura incluye agenda académica, consejero determinista y modelo de PDF de horario A4 horizontal generado localmente, sin incluir correo por defecto ni enviar datos del estudiante a servicios remotos.

> Nota de transferencia: este README contiene secciones históricas de la línea base que ya no representan el estado actual. `PROJECT_CONTEXT.md`, `main`, las migraciones remotas y Production tienen precedencia.
