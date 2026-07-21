# Consistencia de avatares versionados

## Causa del bug

El flujo anterior sobrescribía siempre el mismo objeto público de Storage: `{userId}/avatar.{extension}`. Aunque el archivo cambiara, la URL pública permanecía idéntica, por lo que el navegador o la CDN podían seguir sirviendo una versión anterior. Además, el formulario cerraba el modal antes de confirmar que `profiles.avatar_url` hubiera quedado persistido en Supabase.

## CDN y rutas estables

Una URL pública estable es cacheable por navegadores, proxies y CDN. Sobrescribir el objeto detrás de esa URL no garantiza propagación inmediata. Por eso el avatar podía verse como A, B o C según caché local/CDN, recarga o nueva sesión.

## Arquitectura con rutas inmutables

Cada subida genera una ruta nueva dentro de la carpeta del usuario:

```text
{userId}/avatars/{versionId}.{extension}
```

`versionId` se genera localmente con `crypto.randomUUID()` y fallback seguro para entornos sin soporte. La subida usa `upsert: false`, conserva `contentType` y aplica cache largo porque el path es inmutable.

## Orden de operaciones para reemplazo

1. Conservar `previousAvatarUrl`.
2. Generar un path nuevo.
3. Subir el archivo nuevo con `upsert: false`.
4. Obtener la nueva URL pública.
5. Persistir `profiles.avatar_url` mediante el store/repositorio y esperar confirmación.
6. Actualizar estado React y caché local/cloud.
7. Limpiar el avatar anterior si el path es propio y validado.

## Rollback

Si falla la subida, el perfil no cambia y se conserva el avatar anterior. Si falla la persistencia de `profiles.avatar_url`, se elimina el archivo recién subido como rollback compensatorio, se conserva el perfil anterior y se muestra un mensaje seguro al usuario.

## Limpieza

La limpieza del objeto anterior ocurre solo después de confirmar el perfil nuevo. Si falla, se registra como limpieza pendiente en consola de desarrollo y no se revierte el avatar nuevo, porque `profiles.avatar_url` ya apunta a la versión válida.

## Compatibilidad legacy

Los helpers aceptan rutas legacy propias:

```text
{userId}/avatar.png
{userId}/avatar.jpg
{userId}/avatar.webp
```

También aceptan rutas nuevas versionadas. Se rechazan dominios externos, buckets distintos, path traversal, carpetas de otros usuarios, URLs malformadas, extensiones no permitidas, queries y fragmentos.

## Checklist manual en Preview

1. Iniciar sesión.
2. Subir A.
3. Guardar.
4. Comprobar URL A en `profiles`.
5. Subir B sin cerrar sesión.
6. Comprobar URL B distinta.
7. Comprobar B inmediatamente.
8. Recargar y comprobar B.
9. Subir C sin cerrar sesión.
10. Comprobar URL C distinta.
11. Recargar y comprobar C.
12. Cerrar e iniciar sesión.
13. Comprobar C.
14. Eliminar C.
15. Recargar y comprobar que no hay avatar.
16. Confirmar que ningún avatar de otro usuario fue afectado.

## Checklist manual multicuenta A/B

Usar perfil normal para usuario A y ventana incógnito o segundo perfil Chrome para usuario B. No usar dos pestañas normales del mismo origen como sesiones independientes.

1. A sube A1.
2. B sube B1.
3. Confirmar que Storage crea carpetas distintas.
4. Confirmar que `profiles` guarda URLs distintas.
5. A reemplaza A1 por A2.
6. Confirmar que B permanece con B1.
7. B reemplaza B1 por B2.
8. Confirmar que A permanece con A2.
9. Recargar ambos contextos.
10. Cerrar y reabrir ambos contextos.
11. Abrir dos pestañas del mismo perfil y cambiar sesión.
12. Confirmar que la aplicación bloquea transición y nunca mezcla datos.
13. Confirmar que cada subida nueva aparece bajo `/avatars/{uuid}`.
14. Confirmar que ninguna ruta legacy nueva es creada.
