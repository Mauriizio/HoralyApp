# Supabase Security Advisor

## Riesgo aceptado: protección contra contraseñas filtradas

La advertencia de leaked password protection no debe corregirse por SQL. Esta protección se activa desde Supabase Auth y requiere plan Supabase Pro.

El proyecto se mantiene actualmente en plan Free, por lo que el riesgo queda aceptado antes del lanzamiento comercial. Al subir de plan, el propietario debe activar inmediatamente la protección contra contraseñas filtradas en Supabase Dashboard > Authentication > Security.

## Validación manual del propietario

1. Ejecutar `Project > Security Advisor > Run checks` en Supabase Dashboard después de aplicar la migración.
2. Confirmar que las advertencias técnicas de funciones y Storage desaparecen.
3. Verificar un registro real con email/contraseña y confirmar que se crea exactamente un perfil.
4. Probar avatar en producción: primer upload, segundo upload con upsert, visualización por URL pública y eliminación.
5. Confirmar que leaked password protection queda documentado como riesgo aceptado mientras el proyecto siga en Free.
