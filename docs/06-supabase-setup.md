# Supabase setup

1. Crear un proyecto en Supabase.
2. Ejecutar las migraciones de `supabase/migrations/` en orden.
3. Crear/verificar el bucket `avatars`. La migración lo crea público con límite 2 MB y MIME `image/png`, `image/jpeg`, `image/webp`.
4. Configurar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en `.env.local` y Vercel. No usar `SUPABASE_SERVICE_ROLE_KEY` en el cliente.
5. En Auth > URL Configuration, agregar la URL de producción y previews autorizados para recuperación de contraseña.
6. En Vercel, configurar las mismas variables públicas por entorno.
7. Probar registro con correo/contraseña desde `/auth/register`.
8. Comprobar RLS intentando leer filas de otro usuario: no deben devolverse resultados.

El bucket de avatares es público para renderizar imágenes sin URLs firmadas en la UI. Las políticas restringen subida, reemplazo y eliminación a rutas `avatars/{user_id}/...`.

## URLs locales, Preview y Production

La URL pública se centraliza con esta prioridad: `NEXT_PUBLIC_SITE_URL`, `window.location.origin` en cliente, `VERCEL_PROJECT_PRODUCTION_URL` o `VERCEL_URL` en servidor, y `http://localhost:3000` en desarrollo. Usa `NEXT_PUBLIC_SITE_URL=http://localhost:3000` localmente y configura los dominios reales de Vercel en Supabase Auth > URL Configuration.

Variables esperadas en Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` preferida
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` solo compatibilidad
- `NEXT_PUBLIC_SITE_URL`

No versionar `.env.local`, `supabase/.temp`, service role, tokens, contraseñas ni cadenas privadas.
