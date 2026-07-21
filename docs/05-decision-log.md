# 05 — Decision log

## 2026-07-18 — Línea base MVP

- `commandKey` es opcional en `Subject`, se autogenera al crear/migrar, se puede editar manualmente, se normaliza en mayúsculas sin espacios y máximo 8 caracteres, y debe ser único.
- Las notas históricas no se reinterpretan ni convierten automáticamente al cambiar escala.
- El gestor oficial es pnpm; `pnpm-lock.yaml` es el lockfile canónico.
- La PWA debe ser instalable con shell offline básico y caché conservadora.
- Los recordatorios no prometen ejecución con la app cerrada hasta implementar Web Push remoto y scheduler backend.
- No se integra Supabase, IA externa, red social, pagos ni plugins externos en esta iteración.

## 2026-07-18 — Runner de pruebas

- Se usa `node:test` nativo con un loader local de TypeScript para evitar dependencias nuevas durante la línea base y mantener compatibilidad con Node 20/22. La instalación de Vitest quedó descartada en esta ejecución porque el registry devolvió 403 al intentar descargar paquetes.

## 2026-07-18 — ESLint diferido

- La integración completa de ESLint queda registrada como deuda técnica P1.
- No se mantiene un script `lint` incompleto ni un sustituto basado en `tsc`.
- La implementación posterior debe cubrir Next.js, TypeScript, TSX y React Hooks con configuración flat real y dependencias sincronizadas en `pnpm-lock.yaml`.

## 2026-07-18 - Supabase Auth y persistencia privada

- Se incorpora Supabase Auth con correo/contraseña y clientes SSR/browser compatibles con App Router.
- Se mantiene modo invitado/local cuando faltan variables públicas.
- Se separa acceso a datos mediante repositorios local y Supabase.
- El bucket `avatars` queda público para lectura simple de avatar; escrituras quedan restringidas por políticas de Storage basadas en `user_id`.

## 2026-07-19 — Cierre de UX Auth para producción

Se mantiene Supabase Auth con confirmación de correo habilitada. Se añade una capa de helpers puros para clasificar resultados y errores, enmascarar correos, construir URLs públicas y evitar open redirects. La UI diferencia registro pendiente, sesión inmediata, correo no confirmado, credenciales inválidas, rate limit, error de red y enlaces expirados o reutilizados. Quedan como pasos manuales del propietario validar dominios finales en Vercel/Supabase y revisar RLS en el proyecto real tras cada cambio de esquema.

## 2026-07-20 — Gestión visible de semestres sin eliminación definitiva

Se decide completar la interfaz visible de semestres con selector en Dashboard y gestor en Preferencias. La eliminación definitiva queda fuera de alcance: archivar conserva historial y restaurar vuelve a dejar el semestre disponible. Se mantiene la regla de un único semestre activo y el onboarding puede revisarse sin destruir ni duplicar datos existentes.

## 2026-07-21 — Auth UX de lanzamiento y primera herramienta eléctrica

Se centralizan las acciones públicas de invitado, se añade confirmación de contraseña y se deja Google OAuth detrás de `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`. Se registra la plataforma interna de herramientas con catálogo y se habilita el plugin local de código de colores de resistencias. No se modifican migraciones, RLS ni Storage.

## 2026-07-21 — Plataforma extensible de herramientas autocontenidas

HoralyApp funciona como plataforma extensible de herramientas internas. Las herramientas son módulos autocontenidos y el host no conoce sus implementaciones. La integración permanente requiere copiar la carpeta del módulo, registrar una exportación en `plugins/index.ts` y ejecutar la suite de validación.
