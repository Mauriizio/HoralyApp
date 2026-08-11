# QA visual — Horarily Companion + Dashboard compacto

Fecha: 2026-08-11

## Referencias canónicas

- `docs/design/references/dashboard-mobile-v1.png`
- `docs/design/references/dashboard-desktop-v1.png`

## Comparación directa

- `comparison-dashboard-mobile-reference-vs-result.png` (referencia a la izquierda, resultado 390×844 a la derecha)
- `comparison-dashboard-desktop-reference-vs-result.png` (referencia a la izquierda, resultado 1440×900 a la derecha)

La comparación confirma la misma dirección de producto: saludo sin hero, métricas compactas, horario en línea temporal, resumen tabular, pendientes y calendario. El resultado no se declara pixel-perfect: conserva la mascota permanente requerida y usa 2×2 métricas en mobile, por lo que agenda queda bajo pendientes en el flujo móvil.

## Viewports verificados

- `companion-dashboard-mobile-360x800.png`
- `companion-dashboard-mobile-390x844.png`
- `companion-dashboard-mobile-430x932.png`
- `companion-dashboard-desktop-1280x800.png`
- `companion-dashboard-desktop-1440x900.png`

## Estados y flujos

- `companion-dashboard-advanced-on-390x844.png`: Companion presente y consola avanzada disponible, sin segunda mascota.
- `companion-tutorial-active-no-duplicate-390x844.png`: tutorial activo; 0 Companion y 0 mascota en consola, 1 diálogo de tutorial.
- `companion-materias-390x844.png`: materias con el semestre activo.
- `companion-pendientes-390x844.png`: pendientes con el semestre activo.
- El calendario/agenda es visible en `companion-dashboard-desktop-1440x900.png` y bajo Pendientes en mobile.

## Comprobaciones automatizadas de navegador

- Horarily Companion con modo avanzado OFF: 1.
- Consola avanzada con modo avanzado OFF: 0.
- Tutorial activo: Companion 0, mascota avanzada 0, diálogo 1.
- Overflow horizontal en 390×844: no.
- Horario, resumen de asignaturas, pendientes y calendario presentes en DOM con datos reales.
- Consola: sin errores críticos; únicamente mensajes informativos de desarrollo/HMR e identidad invitada.
- Bottom navigation: cinco destinos visibles en las capturas mobile.
