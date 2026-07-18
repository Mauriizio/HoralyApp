# 05 — Decision log

## 2026-07-18 — Línea base MVP

- `commandKey` es opcional en `Subject`, se autogenera al crear/migrar, se puede editar manualmente, se normaliza en mayúsculas sin espacios y máximo 8 caracteres, y debe ser único.
- Las notas históricas no se reinterpretan ni convierten automáticamente al cambiar escala.
- El gestor oficial es pnpm; `pnpm-lock.yaml` es el lockfile canónico.
- La PWA debe ser instalable con shell offline básico y caché conservadora.
- Los recordatorios no prometen ejecución con la app cerrada hasta implementar Web Push remoto y scheduler backend.
- No se integra Supabase, IA externa, red social, pagos ni plugins externos en esta iteración.

## 2026-07-18 — Runner de pruebas

- Se usa `node:test` nativo con `--experimental-strip-types` para evitar dependencias nuevas durante la línea base. La instalación de Vitest quedó descartada en esta ejecución porque el registry devolvió 403 al intentar descargar paquetes.
