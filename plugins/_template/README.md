# __PLUGIN_NAME__

Herramienta interna autocontenida para HoralyApp.

## Contrato

- Exportar un único `ToolPluginModule` desde `index.ts`.
- Mantener dominio puro en `domain.ts`.
- Recibir solo `ToolPluginProps` en `ui.tsx`.
- No importar Supabase, cookies, JWT, store global, iframes, `eval` ni JavaScript remoto.

## Integración

1. Implementa la herramienta en esta carpeta.
2. Registra una sola línea en `plugins/index.ts`.
3. Ejecuta `pnpm typecheck`, `pnpm test` y `pnpm build`.
