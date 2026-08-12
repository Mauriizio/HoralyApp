# QA — Horario y Cuaderno Pro v2

Fecha: 2026-08-12. Rama: `codex/schedule-notebook-ux-v2`.

Chrome se automatizó mediante DevTools Protocol contra Next.js local con un dataset guest v6 reproducible. Se capturaron Horario a 360×800, 390×844, 430×932, 1280×800 y 1440×900; editor inline, selector/editor de Cuaderno y canvas en móvil y desktop.

Verificado visualmente: mascota y Horarily; cuatro días sin viernes; ocho módulos sin overflow; diálogo con draft, 12/24, Guardar y Cancelar; Orbit como icono; toolbar móvil; export/share; y canvas con lápiz, borrador, grosor, undo/redo, limpiar e insertar.

`schedule-v2-8-modules-4-days.pdf` fue renderizado con PyMuPDF: 1 página A4 landscape, ocho filas completas, lunes-jueves, wrapping, leyenda y footer Horarily.

`notebook-pro-v2-export.pdf` fue renderizado con PyMuPDF: 1 página con heading, lista, imagen, dibujo, PDF privado listado y footer Horarily.

Limitación: Docker Desktop no está disponible; `supabase db reset` y `supabase test db` no conectaron. Las pruebas pgTAP quedan versionadas pero no se presentan como ejecutadas. No hay credenciales A/B disponibles para QA manual real.
