# ROADMAP.md — HoralyApp

> Roadmap operativo posterior a la fusión de la PR #14.

## Estado general

| Área | Estado |
|---|---|
| Línea base, CI y build | Completado |
| Supabase/Auth/RLS | Completado |
| Perfiles y avatares | Completado |
| Aislamiento multicuenta | Completado |
| Semestres y onboarding | Completado |
| Dashboard base | Completado |
| Plataforma de herramientas | Completado |
| Plugin de resistencias v1 | Completado, pendiente refinamiento |
| Notas jerárquicas 60/40 | Completado |
| Agenda y timezone | Completado |
| Consejero determinista | Completado |
| PDF del horario | Completado |
| QA integral de Production | Pendiente |
| Release Candidate comercial | Pendiente |
| Diseño/branding final | Pendiente |
| Asistente natural beta | Pendiente |

---

## Fase 0 — Auditoría de transferencia y Production

### Objetivo

Reconciliar la documentación con el estado real de:

- `main`;
- Vercel Production;
- Supabase;
- GitHub Actions;
- Security Advisor;
- flujos críticos.

### Criterios de salida

- HEAD de Production identificado.
- `pnpm check` verde en checkout limpio.
- Migraciones local/remoto alineadas.
- Security Advisor revisado.
- QA móvil completado.
- Defectos P0/P1 corregidos o registrados.
- Issue #1 actualizado.

### QA obligatorio

- invitado;
- Auth;
- A/B;
- avatar;
- semestres;
- horario;
- notas 60/40;
- agenda;
- PDF;
- herramientas.

---

## Fase 1 — Estabilización post-PR #14

Solo se abre si la auditoría detecta fallos.

Prioridad:

1. P0 pérdida de datos o seguridad.
2. P1 persistencia de notas, grupos y semestres.
3. P1 PDF o agenda principal.
4. P2 UX importante.
5. P3 estética se difiere.

Una sola PR de estabilización si los hallazgos están relacionados.

---

## Fase 2 — Planificación diaria proactiva

### Objetivo

Convertir HoralyApp en una herramienta usada todos los días.

### Alcance

- panel “Hoy”;
- prioridades;
- evaluaciones próximas;
- vencimientos;
- bloques de estudio sugeridos;
- acciones rápidas;
- carga de 7/30 días;
- recordatorios accionables;
- snooze y descartar;
- historial de recomendaciones;
- onboarding progresivo;
- estados vacíos guiados;
- filtrado por semestre activo.

### Restricciones

- sin LLM;
- sin Google Calendar;
- sin red social;
- sin pagos;
- sin rediseño total.

---

## Fase 3 — Release Candidate comercial

### Calidad

- Playwright E2E;
- matriz navegadores;
- QA móvil real;
- accesibilidad;
- performance;
- bundle;
- Lighthouse;
- PWA/offline;
- instalación limpia.

### Seguridad

- Security Advisor;
- branch protection;
- secret scanning;
- Dependabot;
- revisión RLS;
- revisión Storage;
- pruebas A/B;
- rate limits.

### Operación

- SMTP externo;
- monitoreo de errores;
- analytics privados;
- backups;
- exportación/importación;
- términos;
- privacidad;
- soporte;
- datos demo;
- beta con usuarios piloto.

### Criterio de salida

Producto estable para una beta real sin intervención técnica constante.

---

## Fase 4 — Identidad visual y experiencia premium

- nombre y marca definitivos;
- logo;
- paleta;
- tipografía;
- navegación;
- layouts;
- responsive;
- microinteracciones;
- PDF refinado;
- landing;
- capturas comerciales;
- onboarding visual.

No alterar arquitectura de dominio durante esta fase salvo necesidad comprobada.

---

## Fase 5 — Herramientas técnicas

- mejorar plugin de resistencias;
- Ley de Ohm;
- conversor de unidades;
- tablas de verdad;
- fasores;
- cálculo de potencia;
- herramientas de automatización;
- temporizador de estudio.

Cada herramienta debe cumplir `docs/20-adding-tools.md`.

---

## Fase 6 — Asistente natural beta

Solo después de Release Candidate.

### Arquitectura

- proveedor intercambiable;
- tool calling;
- lectura estructurada;
- acciones con confirmación;
- límites de uso;
- privacidad;
- auditoría;
- fallback determinista.

### Prohibido

- usar LLM para cálculos académicos;
- inventar notas;
- modificar datos sin confirmación;
- entregar datos privados a plugins;
- depender de un único proveedor.

---

## Fase 7 — Post-MVP

- integración de calendario;
- colaboración académica;
- feed controlado;
- monetización;
- planes premium;
- marketplace;
- funciones institucionales;
- expansión por carrera.

No iniciar hasta tener métricas reales de uso.

---

## Método permanente

Cada macrofase debe incluir:

- objetivo;
- exclusiones;
- arquitectura;
- criterios de aceptación;
- pruebas;
- rama;
- PR única;
- CI;
- CodeQL;
- Preview;
- QA;
- checkpoint en Issue #1.

Nunca aceptar una entrega solo porque Codex diga que está terminada.
