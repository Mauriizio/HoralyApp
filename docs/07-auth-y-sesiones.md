# Autenticación y sesiones

HoralyApp usa Supabase Auth con correo y contraseña mediante `@supabase/ssr` y `@supabase/supabase-js`.

Flujos visibles:
- `/auth/login`: inicio de sesión.
- `/auth/register`: creación de cuenta.
- `/auth/reset-password`: solicitud de recuperación.
- Menú de cuenta: perfil local, indicador de usuario y cierre de sesión cuando Supabase está configurado.

Si faltan variables públicas, la app compila y opera en modo invitado/local. En desarrollo se muestra un aviso de nube no configurada en las pantallas de auth.
