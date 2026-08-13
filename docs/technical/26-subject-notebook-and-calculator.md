# Cuaderno y calculadora científica

Cuaderno usa `SubjectNote`, `AppData` v5 y la migración
`202607290001_subject_notes.sql`. La calculadora vive en
`plugins/scientific-calculator/` y usa un parser recursivo sin `eval`, red ni
dependencias nuevas.

## Cuaderno Lite estable (2026-08-13)

La superficie de edición usa Lexical con un esquema limitado a párrafos, B/I/U
y fotos locales. Las fotos nuevas se procesan en el navegador y viven en
IndexedDB; no se suben a Storage. El documento sincronizable guarda solamente
el identificador local y muestra un placeholder cuando el blob no existe en el
dispositivo. Los adjuntos cloud históricos se conservan en solo lectura.
