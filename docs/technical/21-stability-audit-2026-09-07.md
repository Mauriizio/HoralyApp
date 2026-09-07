# Auditoría de estabilidad móvil, sesión y sincronización — 2026-09-07

## Alcance

Auditoría previa a cambios solicitada para la versión pública de HoralyApp/HORARILY. Se revisaron primitivas UI, formularios largos, Auth, aislamiento de identidad, store académico, service worker, documentación de seguridad/release y estado del proyecto Supabase accesible desde la conexión actual.

## Resumen ejecutivo

Se detectaron dos causas directas de alta prioridad y una línea de investigación backend bloqueada por permisos:

1. **P0 — Diálogos móviles sin frontera global de viewport.** `DialogContent` y `AlertDialogContent` no imponían altura máxima ni scroll vertical por defecto. Formularios altos como `ReminderForm` podían crecer fuera de la pantalla; la X quedaba fuera del área visible y obligaba a cerrar/reabrir la PWA. Algunas pantallas habían agregado correcciones locales, lo que confirma que el problema era sistémico y no de un único formulario.
2. **P0 — Reinicios innecesarios de identidad para el mismo usuario.** `AuthProvider` incrementaba `authGeneration` para cada `SIGNED_IN`, `INITIAL_SESSION` y `USER_UPDATED`, incluso si el `user.id` no cambiaba. Supabase puede volver a emitir `SIGNED_IN` cuando una sesión existente se confirma o restablece. Como el store depende de `authGeneration`, esto podía vaciar y rehidratar el workspace, cerrar diálogos y generar una sensación de que la app o la sesión se reiniciaron.
3. **P1 — El timeout inicial trataba latencia como logout.** Después de 5 segundos, un fallo o demora de `getSession()` llamaba `applySession(null, "INITIAL_SESSION_ERROR")`. Un problema transitorio podía degradar la experiencia a invitado aunque la sesión almacenada siguiera siendo válida.
4. **P1 — Riesgo de consistencia entre dispositivos pendiente de auditoría live.** El store aplica cambios en React antes de completar varias escrituras cloud (`void persistCloud(...)`). Además, durante hidratación puede usar `loadCloudCache(...)` si falla `repository.loadData()`. Esta combinación puede hacer que un teléfono muestre datos nuevos localmente mientras otro dispositivo todavía ve el servidor anterior si la escritura remota falló. Antes de cambiar el protocolo de sincronización se debe inspeccionar el proyecto Supabase real, logs, RLS, migraciones y comportamiento de escrituras.
5. **P2 — Service worker no aparece como causa primaria.** La versión actual excluye Supabase Auth/REST/Storage y usa estrategia conservadora para navegación/assets. Se mantiene como área a validar en Production, pero no explica por sí sola la X inaccesible ni los reinicios de identidad encontrados en código.

## Evidencia UI

### Primitiva global

Antes de esta estabilización, `components/ui/dialog.tsx` usaba posición fija centrada y `max-w`, pero no `max-height` ni `overflow-y-auto`. La X era un botón absoluto pequeño en `top-4 right-4`.

`components/reminder-form.tsx` abre un formulario largo con título, tipo, materia, prioridad, fecha, hora, varios triggers y descripción dentro de ese diálogo sin una frontera propia de altura.

`components/grades-panel.tsx` ya contenía un parche local con `max-h-[calc(100dvh-1rem)] overflow-y-auto`, señal clara de que distintos equipos/pantallas estaban resolviendo el mismo problema de forma inconsistente.

### Decisión

La corrección debe vivir en la primitiva UI, no replicarse formulario por formulario:

- altura máxima basada en `100dvh`;
- respeto a `safe-area-inset-top/bottom`;
- scroll vertical táctil;
- objetivo táctil amplio para cerrar;
- acciones del footer apiladas y a ancho completo en móvil.

## Evidencia Auth/sesión

El código previo avanzaba `authGeneration` si el evento estaba en:

```text
INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, USER_UPDATED
```

sin exigir un cambio real de usuario. Esto contradice la semántica práctica del listener: un evento `SIGNED_IN` no implica necesariamente una identidad nueva.

### Decisión

`authGeneration` pasa a representar una **frontera real de identidad**:

```text
previousUserId !== nextUserId
```

Un refresh, confirmación o evento repetido del mismo usuario actualiza la sesión pero no desmonta/re-hidrata el workspace.

El timeout inicial deja de convertir un error transitorio en `session=null`; libera el estado de carga y mantiene activo el listener para recuperar la sesión real cuando Supabase responda.

## Sincronización entre teléfono y computador

La sesión de Auth es local a cada navegador/dispositivo. No se debe compartir ni copiar el token de sesión de un teléfono a un computador. La experiencia correcta es:

- cada dispositivo conserva/refresca su propia sesión autenticada;
- al iniciar sesión con el mismo usuario, ambos consumen los mismos datos privados en Supabase;
- una escritura confirmada en un dispositivo debe quedar disponible para una carga posterior del otro;
- fallas remotas no deben presentarse falsamente como “Sincronizado”.

### Pendiente antes de tocar el protocolo cloud

Se requiere acceso al proyecto Supabase de HoralyApp para revisar:

- proyecto/ref correcto y salud;
- Auth y política de sesiones;
- RLS y ownership por `user_id`;
- migraciones aplicadas vs repositorio;
- errores recientes de REST/Auth/Storage;
- tablas con filas huérfanas o duplicadas;
- escrituras fallidas que expliquen divergencia entre dispositivos;
- Security Advisor.

## Estado de acceso Supabase durante la auditoría

La conexión Supabase actualmente disponible en ChatGPT solo expone el proyecto `bitacora-de-juramento`. El proyecto Horaly referenciado por el repositorio (`iexqkxqdkpryuhxeiaeg`) respondió **403 / no autorizado** con esta conexión.

Por seguridad no se intentó inferir credenciales ni modificar el backend sin acceso explícito.

## Cambios autorizados en esta rama

Se aplican únicamente correcciones que pueden justificarse completamente desde la auditoría del repositorio:

- hardening global de `Dialog` y `AlertDialog` para viewport móvil;
- X táctil accesible;
- footers móviles sin superposición;
- estabilización de `AuthProvider` ante eventos repetidos del mismo usuario;
- eliminación del falso logout por timeout inicial;
- regresiones automatizadas para UI móvil y Auth.

La sincronización cloud profunda queda separada hasta completar la auditoría live de Supabase.

## Gates antes de Production

Conforme a `docs/technical/14-release-process.md`:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

Además:

- Preview de Vercel Ready;
- prueba móvil 360x800 y 390x844 de recordatorios y edición de horario;
- abrir/cerrar diálogos con la X y con Cancelar;
- background/foreground repetido sin desmontar el workspace del mismo usuario;
- después de conectar Supabase Horaly, prueba real A/B y teléfono/computador antes del release final de sincronización.
