# ADR-008: Activación guiada y asistente determinista

## Estado

Aceptada.

## Contexto

La creación de materias tenía precondiciones distintas entre la interfaz y la
consola. Además, el workspace podía mostrarse antes de existir un semestre y
una primera materia, dejando una experiencia parcialmente inutilizable.

## Decisión

Se establece un límite de activación previo al App Shell y un único caso de uso
tipado para crear materias. La cuenta continúa siendo opcional. Horarily utiliza
una máquina de estados e intents deterministas; el parser slash se conserva como
compatibilidad avanzada.

La finalización se representa explícitamente para distinguir una activación
incompleta de una persona activada que posteriormente elimina todas sus
materias.

## Consecuencias

- Ninguna URL interna evita la activación mínima.
- UI y consola comparten las mismas precondiciones.
- Los estados legacy válidos se marcan sin duplicar datos.
- La conversación tiene alcance conocido, probado y sin dependencia de LLM.
- No se requieren migraciones: el marcador vive en la configuración JSON
  existente.
