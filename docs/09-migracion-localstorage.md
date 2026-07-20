# Migración desde localStorage

La migración detecta datos en `horario-escolar:v1`, resume materias, bloques, notas, recordatorios y bloques de estudio, y usa upserts idempotentes conservando IDs.

Flujo esperado:
1. Iniciar sesión.
2. Revisar resumen local.
3. Elegir migrar ahora, continuar sin migrar o cancelar.
4. Confirmar.
5. Subir filas con `upsert`.
6. Verificar persistencia.
7. Marcar `migration_status`.
8. Mantener respaldo local; no se elimina `localStorage` automáticamente.

Si falla una parte, no se marca como completada y se puede reintentar sin duplicar datos.

## Prueba manual con dos usuarios

Después de confirmar los correos, crea datos distintos con dos usuarios reales. Verifica materias, notas, recordatorios, horarios, bloques de estudio, perfil y configuración por separado. Si un usuario inicia sesión sin migrar, los datos invitados deben conservarse hasta que el propietario decida migrarlos.
