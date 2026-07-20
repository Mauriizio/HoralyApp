# Pruebas SQL/RLS

Ejecutar localmente con Docker y Supabase CLI disponible:

```bash
pnpm supabase test db
# o
supabase test db
```

Las pruebas cubren estructura, políticas, comportamiento RLS con usuario A/B/anónimo, perfiles, semestre activo único, asociaciones cruzadas, storage avatars y ausencia de `public.ensure_initial_semester` al finalizar la migración.

Para dry-run antes de aplicar al proyecto remoto:

```bash
supabase db reset --local && supabase test db
```
