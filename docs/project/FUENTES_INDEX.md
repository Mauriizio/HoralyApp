# Índice del paquete de fuentes de HoralyApp

## Archivos principales

- `PROJECT_CONTEXT.md`: constitución operativa y contexto completo.
- `AGENTS.md`: reglas obligatorias para agentes y Codex.
- `ROADMAP.md`: fases actuales y futuras.
- `README.md`: copia del README actual de GitHub, con nota de que contiene secciones históricas.
- `ADR/`: decisiones arquitectónicas aceptadas.
- `DOCUMENTACION/`: documentación técnica del repositorio y checkpoint actual.

## Precedencia

Cuando exista una contradicción:

1. `main` y Production.
2. migraciones remotas.
3. `AGENTS.md`.
4. ADR aceptadas.
5. `PROJECT_CONTEXT.md`.
6. documentación técnica reciente.
7. README/documentos históricos.

## Uso en el nuevo ChatGPT

Subir primero:

1. `PROJECT_CONTEXT.md`
2. `AGENTS.md`
3. `ROADMAP.md`
4. carpeta `ADR`
5. carpeta `DOCUMENTACION`
6. `README.md`

Después pedir:

> Conecta GitHub, abre `Mauriizio/HoralyApp`, lee estas fuentes y realiza una auditoría de transferencia sin modificar código.
