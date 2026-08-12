# QA — Horario y Cuaderno Pro v2

Fecha: 2026-08-12. Rama: `codex/schedule-notebook-ux-v2`.

Chrome se automatizó mediante DevTools Protocol contra Next.js local con un dataset guest v6 reproducible. Se capturaron Horario a 360×800, 390×844, 430×932, 1280×800 y 1440×900; editor inline, selector/editor de Cuaderno y canvas en móvil y desktop.

Verificado visualmente: mascota y Horarily; cuatro días sin viernes; ocho módulos sin overflow; diálogo con draft, 12/24, Guardar y Cancelar; Orbit como icono; toolbar móvil; export/share; y canvas con lápiz, borrador, grosor, undo/redo, limpiar e insertar.

`schedule-v2-8-modules-4-days.pdf` fue renderizado con PyMuPDF: 1 página A4 landscape, ocho filas completas, lunes-jueves, wrapping, leyenda y footer Horarily.

`notebook-pro-v2-export.pdf` fue renderizado con PyMuPDF: 1 página con heading, lista, imagen, dibujo, PDF privado listado y footer Horarily.

El gate reproducible `Database Security` se ejecutó en GitHub Actions sobre
`ubuntu-latest` para el commit `9a239e199b0ee29e78f2c4315eb72ab71fcd3461`:

- run `31609118111`: PASS;
- upgrade legacy y backfill `content` → `NoteDocumentV1`: PASS;
- `supabase db reset` desde cero: PASS;
- pgTAP de attachments/RLS: 41/41 PASS;
- Storage API con identidades locales A/B: A CRUD propio, B sin acceso a A y
  anónimo sin lectura, PASS;
- cleanup `supabase stop --no-backup`: PASS.

La migración aditiva `202608120001_notebook_rich_content_attachments.sql` se
aplicó después de ese gate al proyecto documentado `iexqkxqdkpryuhxeiaeg`.
`supabase migration list` confirmó local = remote y la inspección remota mostró
`public.subject_note_attachments`; `db lint` de `public,storage` no reportó
errores. No había credenciales QA A/B remotas, por lo que el aislamiento
conductual se comprobó con dos usuarios reales del Auth local aislado en CI.
