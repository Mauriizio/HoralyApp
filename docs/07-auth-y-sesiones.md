# Autenticación y sesiones

HoralyApp usa Supabase Auth con correo y contraseña mediante `@supabase/ssr` y `@supabase/supabase-js`.

Flujos visibles:
- `/auth/login`: inicio de sesión.
- `/auth/register`: creación de cuenta.
- `/auth/reset-password`: solicitud de recuperación.
- Menú de cuenta: perfil local, indicador de usuario y cierre de sesión cuando Supabase está configurado.

Si faltan variables públicas, la app compila y opera en modo invitado/local. En desarrollo se muestra un aviso de nube no configurada en las pantallas de auth.

## Flujo profesional de autenticación

Registro: si Supabase devuelve sesión, la app considera al usuario autenticado y vuelve al inicio. Si devuelve usuario sin sesión, muestra una vista de confirmación pendiente: correo enmascarado, revisar spam, reenvío, cambiar correo, login y modo invitado.

Reenvío: usa `supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo } })`, con cooldown visible de 60 segundos, loading state y manejo de rate limit.

Login: el error `email_not_confirmed` se traduce como “Tu correo todavía no está confirmado.” y ofrece reenviar confirmación, cambiar correo o recuperar contraseña. Las credenciales inválidas mantienen un mensaje seguro sin revelar si el correo está registrado.

Recuperación: tras `resetPasswordForEmail`, el formulario se reemplaza por “Revisa tu correo para continuar”, correo enmascarado, cooldown de reenvío y explicación de expiración.

Callback: `/auth/callback` procesa `code`, `error`, `error_code`, `error_description` y errores de `exchangeCodeForSession`. Los fallos se envían a `/auth/status` con códigos internos seguros: `email-confirmed`, `password-recovery-ready`, `otp-expired`, `access-denied`, `invalid-link` y `callback-failed`.
