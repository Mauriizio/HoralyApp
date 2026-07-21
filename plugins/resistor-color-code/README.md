# Código de colores de resistencias

Herramienta interna autocontenida de HoralyApp para convertir entre bandas de color y valor nominal de resistencias.

## Estructura

- `manifest.ts`: metadata, permisos, capacidades, estado y rutas internas.
- `domain.ts`: funciones puras sin React ni dependencias del host.
- `ui.tsx`: componente React que recibe únicamente `ToolPluginProps` seguros.
- `index.ts`: export default de un `ToolPluginModule` con loader diferido.

## Seguridad

No usa Supabase, sesión, JWT, cookies, iframes, `eval`, JavaScript remoto ni datos personales. Solo declara navegación interna, clipboard, locale y tema.
