# Auditoría de cuenta, migración y sincronización — 2026-09-29

## Alcance

Auditoría activada por fallos reales reportados en producción:

- bucle del modal “Migrar datos locales”;
- importación/exportación JSON no confiable;
- cambios que parecían sincronizarse pero no quedaban confirmados;
- ausencia de una forma explícita de traer el estado cloud más reciente;
- necesidad de usar una misma cuenta desde varios dispositivos.

## Hallazgos

### 1. Migración parcial seguida de full replace

`lib/local-migration.ts` escribía el dataset completo mediante
`appDataToSupabaseRows`, pero `loadMigratedData` no volvía a leer
`semesters`, `assessment_groups` ni `subject_note_attachments`.

El modal tomaba ese resultado parcial y llamaba después a
`store.replaceAll(result.data)`. El segundo paso podía interpretar las
colecciones omitidas como vacías y borrar/romper datos relacionados.

**Corrección:** la migración ahora relee todas las tablas, verifica el resultado
normalizado y el modal solo refresca desde cloud; no hace un segundo full replace.

### 2. Bucle del modal de migración

La consulta a `migration_status` ignoraba errores y cualquier error se
interpretaba como “migración no completada”. Además “Continuar sin migrar” no
persistía ninguna decisión.

**Corrección:** errores de estado son explícitos, la decisión se guarda por
usuario y el flujo manual sigue disponible desde Preferencias.

### 3. Éxito falso en importación

`store.replaceAll` actualizaba UI y lanzaba la escritura Supabase sin esperarla.
La importación mostraba éxito aunque la operación cloud fallara después.

**Corrección:** para cuentas autenticadas `replaceAll` espera la escritura,
relee Supabase y solo entonces publica el nuevo estado y el éxito.

### 4. Falta de pull cloud entre dispositivos

La carga cloud ocurría principalmente durante hidratación inicial. No existía una
acción clara para “traer la última versión”.

**Corrección:** `refreshFromCloud`, botón “Actualizar desde la nube” y refresh
al recuperar foco/visibilidad, con throttling y barrera de identidad.

### 5. Exportación frágil en Safari/PWA

El ObjectURL del JSON se revocaba en el mismo tick del click y el anchor no se
montaba en DOM.

**Corrección:** anchor temporal en DOM y revocación diferida.

### 6. Snapshot de migración compartido entre cuentas

El respaldo de migración usaba una única clave local global.

**Corrección:** respaldo y decisión de migración aislados por `userId`, con
lectura compatible del formato legacy.

### 7. Importación académica borraba datos personales del receptor

El modo “Importar horario y materias” declaraba preservar datos personales, pero
ponía `studyBlocks`, `reminders`, `grades`, `subjectNotes` y adjuntos en
arreglos vacíos.

**Corrección:** esos registros permanecen con el receptor. Los sujetos y
semestres necesarios para mantener relaciones válidas quedan como historial, y
los IDs/command keys importados se remapean si chocan.

### 8. Posible drift de esquema remoto: reminder_kind

El repositorio contiene la migración
`202608190001_reminder_kind.sql`. La última alineación remota documentada en el
repositorio corresponde a `202608120001_notebook_rich_content_attachments.sql`.

La conexión Supabase disponible durante esta auditoría no expone el proyecto
Horaly `iexqkxqdkpryuhxeiaeg`, por lo que **no se afirma** que la migración de
2026-08-19 esté ausente o presente en producción.

Para evitar que una DB todavía anterior bloquee toda la sincronización, el
cliente incluye compatibilidad temporal: si PostgREST informa que
`reminder_kind` no existe, reintenta el upsert de recordatorios sin esa columna.
El tipo vuelve como `general` hasta que el esquema remoto sea actualizado.

## Garantías añadidas

- Typecheck, tests, build, CodeQL y Database Security siguen siendo gates.
- Pruebas específicas cubren migración completa, aislamiento A/B, decisiones de
  migración, importación con preservación de datos personales, descarga JSON,
  pull cloud y compatibilidad con drift de `reminder_kind`.
- Cache PWA incrementada para forzar recepción del shell corregido.

## Pendiente operacional

Conectar el proyecto Supabase real de Horaly a la integración disponible y
confirmar/aplicar la lista de migraciones remotas. La app ya no debe quedar
bloqueada por `reminder_kind` mientras se completa ese paso.
