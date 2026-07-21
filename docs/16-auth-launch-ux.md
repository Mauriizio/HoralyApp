# Auth UX de lanzamiento

La experiencia pública de Auth usa `components/auth/guest-auth-actions.tsx` como única fuente reusable para invitados. Muestra `Iniciar sesión` y `Crear cuenta`, sin avatar ni menú de cuenta, y renderiza un único skeleton mientras `authLoading` está activo.

Las pantallas `/auth/login`, `/auth/register`, `/auth/reset-password`, `/auth/update-password` y `/auth/status` ofrecen una salida accesible con `aria-label="Volver a Horaly"` y enlaces internos a `/`. Los redirects de callback siguen pasando por `safeInternalRedirect`, que rechaza URLs externas y rutas `//`.

Registro exige correo, contraseña y confirmación. El formulario no envía si las contraseñas no coinciden, bloquea doble submit con `loading` y muestra errores claros en español.

Google OAuth queda preparado con `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`. Si la flag no está activa, el botón no se renderiza y correo/contraseña sigue funcionando. La configuración manual requerida en Supabase/Google Cloud es registrar el origen público del sitio y el callback seguro `/auth/callback`; no se versionan secretos ni Client Secret.
