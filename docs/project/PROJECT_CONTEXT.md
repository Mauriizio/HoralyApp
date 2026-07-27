# PROJECT_CONTEXT.md — Constitución operativa y fuente de verdad de HoralyApp

> Documento de transferencia para continuar HoralyApp en otro ChatGPT sin perder contexto.
>
> **Fecha del checkpoint:** 27 de julio de 2026  
> **Propietario:** Maurizio Caballero  
> **Repositorio:** `Mauriizio/HoralyApp`  
> **Rama principal:** `main`

---

## 1. Función del nuevo chat

El nuevo chat debe actuar como:

- director técnico central;
- arquitecto de software;
- product manager;
- responsable de seguridad;
- líder de QA;
- coordinador de Codex;
- administrador permanente del roadmap y de los checkpoints.

No debe limitarse a resolver tareas aisladas. Debe mantener continuidad, tomar decisiones estructurales, preparar macroprompts controlables, revisar entregas con evidencia real y evitar ciclos de parches.

### Forma de trabajo exigida

Maurizio quiere avanzar mediante **macrofases grandes, coherentes y verificables**.

No quiere:

- un megaprompt sin control;
- microtareas interminables;
- una rama nueva por cada defecto menor;
- varias PR para una sola macrofase;
- arreglar algo y romper otra cosa;
- repetir contexto ya documentado;
- aceptar reportes de Codex sin comprobarlos;
- aplicar migraciones a ciegas;
- confundir Preview con Production;
- dedicar la fase actual a estética si el núcleo aún necesita estabilidad.

El chat debe responder siempre indicando:

1. dónde estamos;
2. qué está verificado;
3. qué no está verificado;
4. qué bloquea;
5. qué debe hacer Maurizio;
6. qué viene después;
7. el prompt de Codex, cuando corresponda.

---

## 2. Fuentes autoritativas y precedencia

### Repositorio

- URL: `https://github.com/Mauriizio/HoralyApp`
- Rama principal: `main`
- Repositorio público.
- Clone URL: `https://github.com/Mauriizio/HoralyApp.git`

### Checkpoint maestro

- Issue: `https://github.com/Mauriizio/HoralyApp/issues/1`
- Título: **Checkpoint maestro — Plan de ejecución HoralyApp MVP**

El cuerpo original del Issue contiene la visión inicial; algunos apartados históricos están desactualizados. Para resolver contradicciones, usar esta precedencia:

1. estado real de `main`;
2. migraciones remotas de Supabase;
3. Production en Vercel;
4. `AGENTS.md`;
5. ADR aceptadas;
6. documentación técnica más reciente;
7. `PROJECT_CONTEXT.md`;
8. comentarios recientes del Issue #1;
9. README y documentos históricos.

### Producción

- `https://horaly-app.vercel.app`
- Vercel despliega `main` a Production.
- Cada PR genera Preview independiente.

### Supabase

- Project ref: `iexqkxqdkpryuhxeiaeg`
- Project URL: `https://iexqkxqdkpryuhxeiaeg.supabase.co`
- Dashboard: `https://supabase.com/dashboard/project/iexqkxqdkpryuhxeiaeg`

No compartir ni pedir en el chat:

- contraseña PostgreSQL;
- access token de Supabase CLI;
- service role;
- JWT;
- refresh token;
- cookies;
- secretos OAuth;
- `.env.local`.

Variables públicas conocidas:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` como compatibilidad histórica
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`

---

## 3. Estado exacto al transferir el proyecto

La última macrofase importante fue:

**PR #14 — Planificación académica avanzada, notas por etapas y PDF de horario**

- Estado: fusionada.
- Merge commit en `main`: `9b530e18e1ded54320a0da1584d43f5e573e41c7`
- Migración aplicada: `202607210001_advanced_grading_groups.sql`
- Validación previa al merge: **165 pruebas aprobadas, 0 fallidas**
- Typecheck: aprobado.
- Build: aprobado.
- Calidad: aprobada.
- CodeQL: aprobado.
- Vercel Preview: aprobado.
- Supabase `db push`: finalizó correctamente.
- El warning de Docker fue sobre cache/catalogación local del CLI; no anuló la migración remota.

El nuevo chat debe verificar si `main` avanzó después de ese commit.

---

## 4. Visión del producto

HoralyApp es una plataforma académica para estudiantes universitarios y técnicos.

No debe tratarse solo como:

- un creador de horarios;
- una agenda;
- una calculadora;
- un chatbot.

El producto combina:

- materias;
- horarios;
- módulos;
- semestres;
- evaluaciones;
- notas;
- ponderaciones;
- proyecciones;
- bloques de estudio;
- recordatorios;
- agenda académica;
- dashboard;
- recomendaciones;
- exportación PDF;
- herramientas técnicas;
- persistencia privada;
- contexto académico acumulativo.

La propuesta de valor es:

> **datos académicos estructurados + automatización proactiva + cálculos verificables + herramientas especializadas + contexto persistente**

Maurizio estudia Ingeniería en Electricidad y Automatización Industrial, por lo que existen herramientas eléctricas, pero la plataforma debe poder crecer hacia otras carreras.

---

## 5. Principios permanentes

### La IA no es la fuente de verdad

La fuente de verdad es:

1. PostgreSQL/Supabase para usuarios autenticados;
2. almacenamiento local validado para invitados;
3. reglas deterministas;
4. cálculos verificables;
5. datos introducidos por el usuario.

La IA futura solo debe interpretar lenguaje natural y llamar herramientas tipadas.

No debe inventar:

- notas;
- fechas;
- horarios;
- promedios;
- eventos;
- recomendaciones sin evidencia.

### Supabase Free

Supabase Free es el plan oficial del lanzamiento inicial.

No recomendar Supabase Pro como requisito para lanzar.

La protección contra contraseñas filtradas no está disponible en Free y queda documentada como riesgo aceptado. Se compensa con RLS, validación, CSP, CodeQL, recuperación segura, políticas de Storage y QA multicuenta.

### Diseño

El rediseño profundo se pospone hasta estabilizar el núcleo.

No mezclar cada fase funcional con:

- paleta definitiva;
- tipografía final;
- animaciones;
- branding premium;
- landing comercial.

---

## 6. Stack tecnológico

Verificar siempre `package.json`, pero el stack conocido es:

- Next.js App Router;
- Next.js 16.2;
- React 19;
- TypeScript;
- Tailwind CSS 4;
- Radix UI / componentes estilo shadcn;
- Recharts;
- Zod;
- Supabase Auth;
- PostgreSQL;
- Supabase Storage;
- `@supabase/supabase-js`;
- `@supabase/ssr`;
- jsPDF 4.2.1;
- pnpm;
- Vercel;
- GitHub Actions;
- CodeQL;
- Dependabot;
- PWA;
- service worker;
- `node:test`;
- loader TypeScript propio.

Node.js 22 es la versión recomendada.

### Comandos principales

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm test
pnpm build
pnpm check
pnpm tool:create mi-herramienta
pnpm supabase migration list
pnpm supabase db push --dry-run
pnpm supabase db push
```

`pnpm check` ejecuta typecheck, tests y build.

### Deuda técnica conocida

- ESLint real para TypeScript/React sigue diferido.
- No aceptar un “lint” simulado basado solo en `tsc`.
- El loader de pruebas muestra warning experimental de Node.
- pnpm puede advertir scripts ignorados de `sharp` o `core-js`.
- Estandarizar Node 22 antes del Release Candidate.

---

## 7. Arquitectura

La arquitectura separa:

- UI;
- aplicación;
- dominio;
- store;
- repositorios;
- persistencia;
- Supabase;
- Auth;
- motor académico;
- plugins;
- PWA;
- adaptadores/exportadores.

Reglas:

- La UI no importa clientes de Supabase.
- Los componentes usan store, casos de uso o repositorios.
- Los repositorios son la frontera local/cloud.
- El dominio debe ser puro cuando sea posible.
- Toda evolución cloud usa migraciones versionadas.
- No usar service role en cliente.
- No usar `any` para ocultar problemas de diseño.

---

## 8. Modelo de datos

Tablas privadas principales:

- `profiles`
- `semesters`
- `subjects`
- `schedule_blocks`
- `study_blocks`
- `reminders`
- `grades`
- `user_settings`
- `migration_status`
- `assessment_groups`

Sistemas relacionados:

- `auth.users`
- `storage.objects`
- `storage.buckets`

Bucket:

- `avatars`
- público para lectura;
- máximo 2 MB;
- PNG/JPEG/WebP;
- escrituras y borrados en carpeta propia;
- avatares con paths versionados.

### `grades`

La tabla histórica evolucionó para representar evaluaciones:

- `id`
- `user_id`
- `semester_id`
- `subject_id`
- `group_id`
- `title`
- `score` nullable
- `weight`
- `status`
- `grade_date`
- `notes`
- timestamps

### `assessment_groups`

Representa etapas de evaluación:

- Evaluación continua;
- Presentación;
- Examen transversal;
- Laboratorio;
- Teoría;
- Proyecto;
- Personalizado.

---

## 9. Migraciones aplicadas

Migraciones remotas aplicadas:

1. `202607180001_auth_private_persistence.sql`
2. `202607200001_foundation_security_semesters.sql`
3. `202607200002_security_advisor_hardening.sql`
4. `202607200003_fix_avatar_first_upload.sql`
5. `202607210001_advanced_grading_groups.sql`

### Regla absoluta

**Nunca editar una migración aplicada.**

Toda corrección futura debe ser una migración nueva.

### Resumen

- `202607180001`: Auth, perfiles, semestres base, materias, horario, estudio, recordatorios, notas, settings, migration status, RLS y avatares.
- `202607200001`: semestres visibles, onboarding, constraints, índices y relaciones por semestre.
- `202607200002`: hardening de funciones y Storage.
- `202607200003`: primera subida de avatar sin habilitar listing amplio.
- `202607210001`: grupos de evaluación, backfill legacy, `group_id`, score nullable, estados, FK compuesta y bridge para clientes antiguos.

---

## 10. Seguridad

### Supabase

- RLS obligatoria.
- Políticas CRUD por propietario: `auth.uid() = user_id`.
- `profiles.id = profiles.user_id`.
- FKs compuestas para impedir cruces entre usuarios, semestres, materias y grupos.
- Service role prohibida en frontend.

### Web

Headers en `next.config.mjs`:

- CSP;
- `frame-ancestors 'none'`;
- `object-src 'none'`;
- `base-uri 'self'`;
- `form-action 'self'`;
- Referrer-Policy;
- Permissions-Policy;
- X-Content-Type-Options.

`unsafe-eval` no debe aparecer en Production.

### Repositorio

- CodeQL configurado.
- Dependabot configurado.
- No fusionar PR de Dependabot automáticamente.
- Verificar branch protection, secret scanning y force push.

### Security Advisor

Estado esperado:

- 0 errores técnicos;
- 1 warning aceptado: Leaked Password Protection Disabled.

---

## 11. Autenticación e identidad

Implementado:

- registro;
- confirmación por correo;
- login;
- logout;
- reenvío;
- recuperación;
- cambio de contraseña;
- confirmación de contraseña;
- PKCE;
- callbacks;
- redirects seguros;
- mensajes en español;
- Google OAuth opcional mediante feature flag.

Google OAuth no debe bloquear lanzamiento.

### Aislamiento multicuenta

Se corrigió un bug crítico de mezcla A/B mediante:

- `authGeneration`;
- `verifyCurrentUser()` con `auth.getUser()`;
- `dataOwnerUserId`;
- `repositoryOwnerUserId`;
- `identityReady`;
- `SessionIdentityMismatchError`;
- remount por `userId`;
- bloqueo durante transición;
- descarte de cargas tardías;
- rollback seguro;
- cache aislada.

QA A/B se hace con ventana normal + incógnito o perfiles distintos. Dos pestañas normales comparten sesión.

---

## 12. Avatares

Path final:

```text
{userId}/avatars/{UUID}.{extension}
```

No reutilizar:

```text
{userId}/avatar.jpg
```

Subida:

- `upsert: false`;
- persistencia confirmada antes de cerrar;
- rollback si falla profile;
- limpieza posterior del avatar anterior;
- no borrar masivamente objetos legacy.

---

## 13. Invitado y migración local

Modo invitado conserva datos en `localStorage`.

Separación conceptual:

- datos invitados;
- caché cloud por usuario;
- backup de migración.

Migración local → cuenta:

- snapshot;
- resumen;
- decisión del usuario;
- upserts idempotentes;
- respaldo;
- no borrar automáticamente;
- no marcar completada si falla.

Importaciones JSON deben validarse antes de reemplazar datos.

---

## 14. Semestres y onboarding

Onboarding incluye:

- nombre;
- institución;
- carrera;
- timezone;
- semestre;
- materias;
- horario.

Semestres:

- crear;
- editar;
- activar;
- archivar;
- restaurar;
- un solo activo;
- conservar historial.

No se eliminan definitivamente desde UI en esta fase.

---

## 15. Notas jerárquicas

Caso central:

- Presentación: 60 %
- Examen transversal: 40 %

Las evaluaciones internas de Presentación suman 100 % del grupo.

Ejemplo:

- Prueba 1: 25 % interno → 15 % final
- Laboratorio: 20 % interno → 12 % final
- Prueba 2: 30 % interno → 18 % final
- Proyecto: 25 % interno → 15 % final

Conceptos del dominio:

- `evaluatedAverage`
- `currentContribution`
- `projectedFinalGrade`
- `definitiveFinalGrade`
- `minimumPossibleFinalGrade`
- `maximumPossibleFinalGrade`
- `requiredScoreForTarget`

Ejemplo verificado:

- Presentación: 5,0
- Peso: 60 %
- Transversal pendiente: 40 %
- Meta: 4,0
- Transversal necesario: 2,5

Eso no significa estar matemáticamente aprobado.

`mathematicallyApproved` solo cuando:

```text
minimumPossibleFinalGrade >= passingGrade
```

`impossibleTarget` cuando:

```text
maximumPossibleFinalGrade < targetGrade
```

Presets:

- continua 100;
- presentación 60 + transversal 40;
- laboratorio 30 + teoría 30 + transversal 40;
- personalizado.

Toda materia debe tener un grupo predeterminado:

- nombre: Evaluación continua;
- kind: continuous;
- peso: 100;
- posición: 1.

Toda nota debe tener `semesterId`, `subjectId` y `groupId`.

---

## 16. Agenda y timezone

La agenda combina:

- clases;
- evaluaciones;
- recordatorios;
- bloques de estudio;
- vencidas sin nota.

Se usa timezone IANA.

Cubierto:

- America/Santiago;
- Europe/Madrid;
- UTC;
- horario de verano;
- timezone inválida;
- fecha inválida.

No depender de la zona horaria del servidor.

---

## 17. Consejero académico

Ubicación:

```text
domain/academic-advisor/
```

Es determinista y no usa LLM.

Cada recomendación contiene:

- id;
- prioridad;
- título;
- mensaje;
- explicación;
- evidencia;
- acción;
- vigencia;
- `subjectId` opcional.

Reglas iniciales:

- evaluación próxima;
- alto peso;
- transversal necesario;
- pesos inválidos;
- falta de estudio;
- carga alta;
- evaluación vencida.

---

## 18. PDF del horario

Librería:

- jsPDF 4.2.1

Import correcto:

```ts
await import("jspdf")
```

No usar imports profundos `jspdf/dist/...`.

Arquitectura:

- `ScheduleDocumentModel`
- `SchedulePdfRenderer`
- `SchedulePdfOptions`

Características:

- A4 horizontal;
- marca Horaly;
- alumno;
- institución;
- carrera;
- semestre;
- tabla semanal;
- módulos;
- colores;
- leyenda;
- footer;
- páginas adicionales;
- preview;
- descarga;
- Web Share cuando sea compatible;
- correo omitido por defecto;
- generación local sin servicios externos.

---

## 19. Plataforma de herramientas

Arquitectura autocontenida.

Archivos clave:

- `plugins/index.ts`
- `plugins/_template/`
- `scripts/create-tool.mjs`
- `docs/20-adding-tools.md`
- `lib/plugins/`
- `components/tools/plugins-view.tsx`

Comando:

```bash
pnpm tool:create calculadora-ley-ohm
```

Contrato:

- `ToolPluginModule`;
- manifest;
- loader;
- versión;
- categoría;
- permisos;
- capabilities;
- feature flag.

Un plugin no recibe:

- Supabase;
- sesión;
- JWT;
- cookies;
- store global;
- secretos.

Prohibido:

- JavaScript remoto;
- `eval`;
- iframes externos;
- modificar `PluginsView` por herramienta;
- modificar `app/page.tsx` para registrar una herramienta.

Plugin inicial:

- `plugins/resistor-color-code/`
- 4, 5 y 6 bandas;
- ambos sentidos;
- versión inicial que puede mejorarse de forma aislada.

---

## 20. PWA

En desarrollo:

- no registrar SW;
- desregistrar workers Horaly existentes;
- limpiar solo caches `horaly-*`.

En Production:

- no cachear Auth;
- no cachear Supabase REST;
- no cachear Storage externo;
- no cachear avatares;
- no cachear recursos externos sensibles.

Auditar offline en Release Candidate.

---

## 21. Proceso de trabajo y merge

Antes de merge:

1. SHA remoto real;
2. rama correcta;
3. instalación frozen;
4. typecheck;
5. tests;
6. build;
7. check;
8. GitHub Actions;
9. CodeQL;
10. Vercel Preview;
11. QA manual;
12. dry-run si hay DB;
13. revisión de threads.

Preferir:

- una rama;
- una PR por macrofase;
- `Squash and merge`.

Preview corresponde a la PR. Production corresponde a `main`.

### Flujo obligatorio para bugs

```text
reproducir
→ prueba que falla
→ implementar
→ prueba pasa
→ QA real
→ CI
→ Preview
→ merge
```

---

## 22. Historial de macrofases

- PR #2: auditoría y estabilización.
- PR #3/#4/#5: Supabase, Auth, persistencia y UX Auth.
- PR #6: constitución técnica, onboarding, semestres, dashboard y seguridad.
- PR #10: gestión visible de semestres.
- PR #11: hardening de Security Advisor.
- PR #12: avatares versionados y aislamiento A/B.
- PR #13: Auth UX, plataforma de herramientas y resistencias.
- PR #14: planificación académica avanzada, notas jerárquicas, agenda, consejero y PDF.

---

## 23. Deudas y riesgos

Auditar:

- README parcialmente histórico/desactualizado;
- ESLint real;
- Node 22;
- loader experimental;
- scripts ignorados por pnpm;
- Playwright E2E;
- pgTAP real con Docker;
- SMTP externo;
- monitoreo;
- backups;
- exportación;
- branch protection;
- Security Advisor;
- PWA offline;
- accesibilidad;
- performance;
- diseño;
- Google OAuth;
- limpieza de avatares legacy;
- privacidad y términos;
- analytics;
- rate limits.

Postergar hasta núcleo estable:

- red social;
- pagos;
- marketplace;
- colaboración;
- Google Calendar completo;
- IA generativa completa.

---

## 24. Próxima ruta

### Fase inmediata: auditoría de transferencia y Production

No construir una macrofase nueva hasta verificar:

- HEAD real de `main`;
- Production de Vercel;
- migraciones remotas;
- Security Advisor;
- flujos críticos en teléfono;
- persistencia real de notas;
- PDF;
- A/B;
- semestres;
- agenda.

### Luego: planificación diaria proactiva

- prioridades del día;
- evaluaciones próximas;
- carga semanal;
- acciones sugeridas;
- snooze;
- recordatorios;
- historial;
- onboarding progresivo.

### Después: Release Candidate comercial

- Playwright E2E;
- accesibilidad;
- performance;
- bundle;
- PWA;
- SMTP;
- privacidad;
- términos;
- respaldo;
- monitoring;
- analytics;
- instalación limpia;
- beta controlada.

### Después: diseño y branding

- paleta;
- tipografía;
- navegación;
- responsive;
- marca;
- logo;
- landing;
- refinamiento del PDF.

### Después: asistente natural beta

Solo después del RC estable.

---

## 25. Primera misión del nuevo chat

1. Conectar GitHub.
2. Abrir `Mauriizio/HoralyApp`.
3. Leer `AGENTS.md`.
4. Leer esta constitución.
5. Leer los ADR.
6. Leer documentación 10–24.
7. Verificar `main`.
8. Verificar Production.
9. Verificar Supabase.
10. Ejecutar o pedir:

```bash
cd /c/Proyectos/horary
git switch main
git pull origin main
git status
git log -1 --oneline
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm check
pnpm dev
pnpm supabase migration list
pnpm supabase db push --dry-run
```

No modificar código durante la auditoría inicial.

Clasificar hallazgos:

- P0: seguridad, pérdida de datos, caída;
- P1: flujo principal roto;
- P2: importante no bloqueante;
- P3: estética.

Actualizar el Issue #1 con el resultado.

---

## 26. Principio final

La prioridad no es producir muchas líneas de código.

La prioridad es:

> **producto útil + datos seguros + cálculos correctos + arquitectura mantenible + avance rápido sin bucles**

Cada cambio debe dejar HoralyApp más estable, no solamente más grande.
