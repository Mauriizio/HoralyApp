# Checkpoint actual de HoralyApp

## Estado verificado al transferir

- Repositorio: `Mauriizio/HoralyApp`
- Rama: `main`
- Production: `https://horaly-app.vercel.app`
- PR #14: fusionada
- Merge commit: `9b530e18e1ded54320a0da1584d43f5e573e41c7`
- Migración `202607210001_advanced_grading_groups.sql`: aplicada
- Validación previa al merge: 165 tests, 165 pass, 0 fail
- Typecheck y build: aprobados
- Calidad, CodeQL y Vercel Preview: aprobados

## Funcionalidad disponible

- Auth y cuentas
- Perfil y avatar versionado
- Aislamiento A/B
- Supabase/RLS
- Semestres
- Onboarding
- Horario
- Estudio
- Recordatorios
- Notas jerárquicas
- Preset 60/40
- Proyección de transversal
- Agenda con timezone
- Consejero determinista
- PDF de horario
- Plataforma de herramientas
- Plugin de resistencias v1

## Próximo paso

Realizar auditoría de Production y reconciliar:

1. HEAD real de `main`
2. commit de Vercel Production
3. migraciones remotas
4. Security Advisor
5. persistencia real de notas
6. PDF en móvil
7. A/B
8. semestres y agenda

No iniciar una nueva macrofase antes de terminar esta auditoría.

## Cierre de jornada — 2026-07-28

### Trabajo completado

- Evolución visual del App Shell con sidebar de escritorio y navegación inferior móvil.
- Dashboard y agenda académica con información accionable y jerarquía visual consistente.
- Onboarding guiado y gestión de materias integrada al flujo académico.
- Sistema flexible de evaluaciones con grupos jerárquicos, evaluación continua, parciales y transversal.
- Separación entre peso interno y aporte final, validación estricta de ponderaciones y transversal estándar automática.
- Registro calificado, edición, eliminación y actualización inmediata con persistencia local/cloud.
- Tarjetas de evaluaciones canónicas, materias colapsables y sección secundaria de detalles y estadísticas.
- Formularios secuenciales, errores junto a cada campo, modales cerrables y adaptación responsive.
- Escala chilena predeterminada para estados nuevos y conservación de escalas personalizadas existentes.
- Pruebas de regresión para estructuras, límites, edición, escalas, persistencia y contratos de UI.
- Validación local final: 184 pruebas aprobadas, typecheck, build y check aprobados.

### Pendientes siguientes

#### QA móvil real

- Probar HORARILY en un teléfono físico.
- Verificar navegación inferior y drawer “Más”.
- Probar modales, teclado móvil, scroll y safe areas.
- Probar la PWA instalada y sesiones autenticadas.
- Crear, editar y eliminar notas.
- Confirmar persistencia después de cerrar y volver a abrir la aplicación.

#### PDF del horario

Problemas observados:

- La leyenda inferior solapa los nombres de las materias.
- Los nombres largos chocan entre sí.
- Algunos textos de las celdas quedan cortados.
- La altura de la leyenda no se adapta dinámicamente.

Trabajo futuro:

- Implementar leyenda multilínea y distribución dinámica.
- Añadir saltos de línea controlados, truncado o abreviaturas coherentes.
- Usar tamaños de fuente adaptativos.
- Soportar muchas materias sin solapamientos.
- Revisar el encabezado y la composición general del PDF.

#### Logotipo institucional opcional

- Permitir cargar PNG, JPG o WebP desde onboarding o Preferencias.
- Validar formato y tamaño, y redimensionar o comprimir.
- Incorporar vista previa, reemplazo y eliminación.
- Diseñar primero una persistencia local/cloud segura y compatible, sin migraciones improvisadas.
- Mostrar el logotipo discretamente en el dashboard e incluirlo en la esquina superior del PDF.
- Mantener el onboarding completamente opcional cuando no exista logotipo.

#### Encabezado institucional del PDF

Organizar correctamente:

- Logotipo opcional.
- Institución.
- Carrera.
- Estudiante.
- Semestre.
- Período.
- Fecha de generación.
- Título “Horario académico”.

#### QA de uso real

- Utilizar la aplicación durante varios días con materias, horarios, notas y pendientes reales.
- Registrar fricciones antes de iniciar otra macrofase.
- Revisar nuevamente la fidelidad visual respecto a los mockups.

## Activación guiada obligatoria y Horarily — 2026-07-28

### Implementado

- Límite full-screen previo al App Shell para primeras activaciones incompletas.
- Cuenta opcional: invitado local o acceso mediante las rutas Auth existentes.
- Flujo breve de nombre, semestre, primera materia y confirmación.
- Primera materia obligatoria mediante nombre simple, con clave automática,
  color seguro, confirmación y protección contra duplicados.
- Reanudación del último paso y marcador compatible para activaciones legacy
  válidas, sin borrar ni duplicar datos.
- Caso de uso tipado compartido por UI y consola para validar identidad,
  semestre activo y duplicados antes de crear materias.
- Horarily basado en el SVG maestro, con estados breves y reducción de
  movimiento accesible.
- Asistente conversacional determinista con máquina de estados, intents locales,
  acciones visibles y comandos slash preservados como modo avanzado.
- Sin LLM, cambios de Supabase, migraciones, RLS ni políticas Storage.

### Verificación de la rama

- `pnpm typecheck`, `pnpm build`, `pnpm check` y `git diff --check`: aprobados.
- Suite local: 193 pruebas aprobadas, 0 fallidas.
- QA invitado: bloqueo por URL, reanudación, primera materia, dashboard,
  conversación natural y persistencia tras recarga aprobados.
- Responsive sin desbordamiento horizontal: 360, 390, 768, 1024, 1280 y
  1440 px.
- Pendiente externo: QA con una cuenta autenticada QA en perfiles separados y
  verificación PWA en un teléfono físico.
