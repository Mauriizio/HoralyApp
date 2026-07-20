# Proceso de release

1. Crear rama de macrofase desde `main` actualizado.
2. Commits lógicos y revisables.
3. Ejecutar `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm build` y `pnpm check`.
4. Ejecutar pruebas SQL con `pnpm supabase test db` o `supabase test db` cuando Docker esté disponible.
5. Abrir una sola PR contra `main` con checklist de macrofase.
6. Esperar CI verde y Vercel Preview Ready.
7. Merge solo por el propietario/revisor autorizado.

## Checklist de release para semestres

Antes de liberar cambios de semestres se debe validar que solo exista un semestre activo, que el selector no liste archivados, que archivar conserve historial, que restaurar vuelva a dejar el semestre disponible y que el onboarding pueda reabrirse sin duplicar semestres ni borrar datos. También debe comprobarse persistencia como invitado local y como usuario autenticado con Supabase.
