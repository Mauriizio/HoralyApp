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
