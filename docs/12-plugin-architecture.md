# Arquitectura de plugins internos

HoralyApp funciona como plataforma extensible de herramientas internas. Las herramientas son módulos autocontenidos y el host no conoce sus implementaciones.

## Contrato

El contrato separa `PluginManifest` de `ToolPluginModule`. El manifest describe metadata, categoría, estado, rutas, capacidades, permisos y feature flags. El módulo exporta ese manifest y un loader diferido que devuelve el componente React de la herramienta.

`ToolPluginProps` es estable, mínimo y seguro: navegación interna limitada, almacenamiento namespaced opcional, eventos no sensibles, locale, tema, copiado de texto y logger seguro. No entrega cliente Supabase, sesión, JWT, cookies, repositorio académico completo, store global ni variables secretas.

## Registro

`plugins/index.ts` es el único índice concreto de herramientas. `lib/plugins/plugin-registry.ts` no importa herramientas reales: valida módulos recibidos, rechaza diagnósticos seguros y expone `list()`, `get(id)`, `load(id)`, categorías y estado de validación.

Validaciones obligatorias: ID slug, ID único, SemVer, ruta única, categoría reconocida, estado reconocido, loader para herramientas disponibles, feature flag pública válida, capacidades conocidas y permisos compatibles.

## Host

`components/tools/plugins-view.tsx` solo consume metadata y `registry.load(id)`. La UI usa búsqueda, filtros, tarjetas accesibles, carga diferida con `React.lazy`/`Suspense`, fallback accesible y error boundary por herramienta. Agregar una herramienta no debe modificar `PluginsView`, `app/page.tsx` ni otra herramienta existente.

## Seguridad

Los plugins son módulos confiables empaquetados durante build. No cargan JavaScript remoto, no ejecutan `eval`, no usan iframes externos y no acceden a Supabase, cookies, JWT, sesión ni datos personales. Si necesitan persistencia local, usan almacenamiento namespaced y permisos mínimos declarados.
