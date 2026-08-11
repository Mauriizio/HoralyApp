# ADR-010: Cuaderno por materia

## Estado

Aceptada.

## Decisión

Los apuntes son entidades `SubjectNote` independientes por usuario, semestre y
materia. `AppData` v5 conserva un arreglo local y Supabase usa la tabla
normalizada `subject_notes` con RLS y claves foráneas compuestas.

La edición MVP usa `textarea`, preserva saltos de línea y nunca interpreta HTML.
El autosave espera 900 ms y verifica identidad antes y después del guardado.
