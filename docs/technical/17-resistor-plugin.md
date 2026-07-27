# Plugin: código de colores de resistencias

`plugins/resistor-color-code/` es una herramienta interna autocontenida empaquetada durante build. La lógica pura vive en `domain.ts`, la UI en `ui.tsx`, la metadata en `manifest.ts` y el loader en `index.ts`.

## Funciones

- Colores → valor para 4, 5 y 6 bandas.
- Valor → colores con Ω, kΩ y MΩ.
- Tolerancia, coeficiente térmico en 6 bandas, mínimo/máximo y diferencia frente al valor solicitado.
- Rechazo de negativos, `NaN`, `Infinity`, tamaños excesivos y combinaciones físicamente inválidas.

## Integración

El host no conoce la implementación de esta herramienta. `plugins/index.ts` registra su `ToolPluginModule`, el registro valida el manifest y `PluginsView` la carga con `registry.load(id)`.

## Seguridad

La herramienta no usa datos personales, Supabase, cookies, JWT, iframes, `eval` ni JavaScript remoto. Solo declara capacidades mínimas para navegación interna, copiado, locale y tema. El catálogo la ejecuta dentro de un error boundary para que un fallo no rompa HoralyApp.
