# Guía definitiva para agregar herramientas internas a HoralyApp

HoralyApp funciona como plataforma extensible de herramientas internas. Las herramientas son módulos autocontenidos y el host no conoce sus implementaciones.

## A. Plataforma oficial

- TypeScript estricto.
- React sobre Next.js.
- TailwindCSS y componentes UI existentes de HoralyApp.
- Dominio puro separado de React.
- Pruebas con `node:test` y el loader actual `test/typescript-loader.mjs`.
- Gestión de paquetes con `pnpm`.

## B. Arquitectura obligatoria

Cada herramienta vive en `plugins/{plugin-id}/`:

```text
plugins/{plugin-id}/
  manifest.ts
  domain.ts
  ui.tsx
  index.ts
  README.md
```

- `manifest.ts`: `PluginManifest` con `id`, `name`, `description`, `version`, categoría, icono, estado, feature flag, rutas, capacidades y permisos mínimos.
- `domain.ts`: funciones puras, sin React, sin Supabase y sin datos personales.
- `ui.tsx`: componente React que recibe solo `ToolPluginProps`.
- `index.ts`: export default de un único `ToolPluginModule`.
- `README.md`: documentación propia, ejemplos, riesgos y changelog del plugin.
- Tests: dominio, validaciones, accesibilidad básica cuando aplique y contrato de registro.
- Error isolation: el host carga la UI con `React.lazy`, `Suspense` y error boundary.

Contrato estable:

```ts
interface ToolPluginModule {
  manifest: PluginManifest
  load?: () => Promise<{
    default: React.ComponentType<ToolPluginProps>
  }>
}
```

`ToolPluginProps` entrega solo helpers explícitos: navegación interna limitada, almacenamiento namespaced opcional, eventos no sensibles, locale, tema, capacidad de copiar texto y logger seguro. Cada helper usado debe estar cubierto por capabilities/permisos del manifest.

## C. Creación automática

```bash
pnpm tool:create mi-herramienta
```

El generador valida slug, bloquea path traversal, no sobrescribe carpetas, copia `plugins/_template`, reemplaza marcadores y no instala dependencias. El único paso manual posterior es registrar el módulo en `plugins/index.ts`.

## D. Creación manual

1. Copiar `plugins/_template` a `plugins/mi-herramienta`.
2. Renombrar archivos `*.template` a archivos reales.
3. Reemplazar `__PLUGIN_ID__`, `__PLUGIN_NAME__` y `__CATEGORY__`.
4. Implementar `domain.ts`, `ui.tsx`, `manifest.ts`, `index.ts` y `README.md`.
5. Registrar una sola línea en `plugins/index.ts`.
6. Ejecutar `pnpm typecheck`, `pnpm test` y `pnpm build`.

## E. Desarrollo externo o con otra IA

Prompt reutilizable:

> Construye una herramienta compatible con HoralyApp. Debe entregarse como módulo autocontenido en `plugins/{plugin-id}/` con `manifest.ts`, `domain.ts`, `ui.tsx`, `index.ts` y `README.md`. Exporta un único `ToolPluginModule` por default desde `index.ts`. Usa TypeScript estricto, React, TailwindCSS y componentes UI existentes de HoralyApp. Mantén dominio puro separado de React. No agregues dependencias. No importes Supabase, cookies, JWT, sesión, repositorio académico, store global, JavaScript remoto, `eval` ni iframes externos. Declara capabilities y permissions mínimos en el manifest. La UI solo puede recibir `ToolPluginProps`. Añade tests con `node:test` para dominio, entradas inválidas, contrato, accesibilidad básica y ausencia de dependencias prohibidas. Criterios de aceptación: `pnpm typecheck`, `pnpm test`, `pnpm build`, integración agregando solo una exportación en `plugins/index.ts` y QA del catálogo.

Dependencias permitidas: React, utilidades ya existentes del repo y componentes UI de HoralyApp. Dependencias prohibidas: paquetes nuevos sin autorización, SDK de Supabase en plugins, APIs de cookies/JWT/sesión, scripts remotos, iframes externos, `eval`, workers remotos o acceso al store completo.

## F. Integración

1. Copiar la carpeta del módulo a `plugins/{plugin-id}/`.
2. Revisar `manifest.ts`: slug, SemVer, categoría, estado, rutas, feature flag, capabilities y permissions.
3. Registrar una entrada en `plugins/index.ts`.
4. Ejecutar `pnpm typecheck`, `pnpm test`, `pnpm build` y `pnpm check`.
5. Probar catálogo: búsqueda, filtro, apertura, carga diferida, fallback y regreso.
6. Crear PR con riesgos, pruebas, documentación y confirmación de que no se tocaron binarios.

## G. Reglas prohibidas

- No importar Supabase.
- No leer cookies/JWT/sesión.
- No acceder al store completo ni a repositorios académicos.
- No cargar JavaScript remoto.
- No usar `eval`.
- No usar iframes externos.
- No modificar `PluginsView` para una herramienta concreta.
- No modificar `app/page.tsx` para registrar herramientas.
- No cambiar otras herramientas al integrar una nueva.
- No modificar migraciones, RLS ni Storage sin autorización explícita.

## H. Versionado

- Usar SemVer (`MAJOR.MINOR.PATCH`) en `manifest.version`.
- Documentar cambios relevantes en el `README.md` del plugin.
- Mantener compatibilidad del contrato `ToolPluginModule`.
- Migraciones internas solo si están explícitamente aprobadas.
- Deprecar de forma segura: marcar `coming-soon` o feature flag apagada antes de retirar.

## I. Checklist final

- Funcionalidad principal cubierta.
- Seguridad: sin Supabase, cookies, JWT, `eval`, iframes ni JS remoto.
- Accesibilidad: labels, navegación por teclado, estados de carga y errores.
- Responsive: móvil y escritorio.
- Pruebas de dominio, contrato, entradas inválidas y documentación.
- README propio del plugin actualizado.
- Permisos mínimos y capabilities explícitas.
- Aislamiento: loader diferido y error boundary no rompen HoralyApp.
