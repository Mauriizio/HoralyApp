# Plugin: código de colores de resistencias

`plugins/resistor-color-code/` contiene una herramienta interna empaquetada en build. La lógica pura vive en `domain.ts` y la UI en `ui.tsx`.

## Funciones

- Colores → valor para 4, 5 y 6 bandas.
- Valor → colores con Ω, kΩ y MΩ.
- Tolerancia, coeficiente térmico en 6 bandas, mínimo/máximo y diferencia frente al valor solicitado.
- Rechazo de negativos, `NaN`, `Infinity`, tamaños excesivos y combinaciones físicamente inválidas.

## Seguridad

La herramienta no usa datos personales, Supabase, cookies, JWT, iframes, `eval` ni JavaScript remoto. El catálogo la ejecuta dentro de un error boundary para que un fallo no rompa HoralyApp.
