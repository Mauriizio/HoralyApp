# ADR-011 — Cuaderno Lite con Lexical e imágenes locales

## Estado

Aceptada — 2026-08-13.

## Decisión

Cuaderno usa Lexical 0.49.0 (MIT) como única familia de edición. Se habilitan
solo párrafos, texto con negrita/cursiva/subrayado, history e imágenes locales.
Enter, caret, Selection, IME, pegado y undo/redo quedan a cargo del motor; se
retiran la interceptación manual de `beforeinput`, el dibujo, fuentes, headings,
listas y nuevos PDFs adjuntos.

El adaptador persiste exclusivamente el subconjunto seguro de `NoteDocumentV1`;
no guarda HTML. `content` continúa siendo texto plano derivado. Las fotos nuevas
se validan, re-serializan y reducen localmente antes de guardarse como `Blob` en
IndexedDB. El JSON contiene solo `localAssetId`, por lo que una foto ausente en
otro dispositivo produce un placeholder y nunca rompe la nota.

La familia Lexical agrega aproximadamente 34 paquetes transitivos en instalación;
el build mide el efecto real del chunk. Se eligió para reemplazar el control
manual de DOM/Selection que produjo regresiones de Enter y marks.

## Compatibilidad

La conversión lazy conserva texto y B/I/U de documentos anteriores. Drawings,
PDFs y adjuntos cloud no se borran: quedan disponibles en modo de solo lectura.
No hay migración SQL ni cambios de RLS/Storage.
