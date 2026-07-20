# Pruebas SQL/RLS

Ejecutar localmente con Docker disponible:

```bash
pnpm supabase test db
# o
supabase test db
```

Cobertura prevista: tablas, índices, constraints, triggers, políticas CRUD por usuario y storage avatars. Para validación interactiva de aislamiento A/B, crear dos usuarios de prueba y ejecutar consultas con JWT de cada usuario verificando que `auth.uid() = user_id` permite solo filas propias.
