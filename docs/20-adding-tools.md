# Compatibilidad: guía para agregar herramientas

La guía autoritativa está en [`technical/20-adding-tools.md`](technical/20-adding-tools.md).

Resumen del contrato: crear con `pnpm tool:create mi-herramienta`, exportar un
`ToolPluginModule`, usar SemVer, mantener dominio puro, no importar Supabase y
no modificar PluginsView para registrar implementaciones concretas.

## Checklist final

Validar permisos mínimos, accesibilidad, responsive, pruebas, typecheck, build
y ausencia de cambios en migraciones, RLS o Storage.
