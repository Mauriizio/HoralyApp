# 00 — Auditoría del estado actual

## Inventario

- Rutas: `app/layout.tsx` y `app/page.tsx`; la página principal organiza vistas por pestañas internas.
- Componentes: paneles de horario, materias, estudio, recordatorios, notas, analítica, preferencias, PWA y Horarily.
- Hooks: estado local, instalación PWA, móvil, toast y animación de Horarily.
- Dominio: modelos en `lib/types.ts`.
- Almacenamiento: `localStorage` con migración en `lib/storage.ts`.
- PWA: `public/manifest.webmanifest`, `public/sw.js`, `components/pwa-register.tsx` y `hooks/use-pwa-install.ts`.
- Notificaciones: Web Notifications locales en `lib/notifications.ts` y loop cliente en `hooks/use-schedule-store.ts`.
- Internacionalización: `lib/i18n.ts` y `components/i18n-provider.tsx`.
- Analítica académica: `lib/grade-utils.ts` y vistas de notas/analítica.
- Asistente: consola local Horarily sin IA externa.
- Importación/exportación: JSON local desde preferencias.

## Hallazgos corregidos

### P0

- `next.config.mjs` ignoraba errores TypeScript; se eliminó el bypass.
- `Subject.commandKey` se usaba sin estar tipado; se agregó, normalizó, migró y validó.
- Manifest PWA declaraba iconos dentro de `shortcuts`; se corrigió a `icons` y shortcuts válidos.
- Service worker cacheaba rutas inexistentes; se alineó con assets reales.
- Importación JSON podía reemplazar datos con estructura inválida; ahora se valida con Zod y se crea respaldo previo.

### P1

- Faltaban scripts `typecheck`, `test` y `check`.
- Faltaba CI para pull requests.
- Faltaban pruebas para lógica académica crítica.
- `upsertBlock` eliminaba conflictos silenciosamente; ahora requiere confirmación explícita desde UI.
- Cambios de módulos/presets avisan sobre bloques afectados.
- Logs y metadata con rastros de herramienta generadora fueron limpiados.

## Limitaciones de recordatorios

Los recordatorios actuales se calculan en el cliente con un intervalo mientras la app está abierta. No hay Web Push remoto, Push API con servidor ni scheduler backend. Por eso una app cerrada no garantiza la entrega.
