# Proceso de release

1. Crear rama de macrofase desde `main` actualizado.
2. Commits lógicos y revisables.
3. Ejecutar `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm build` y `pnpm check`.
4. Ejecutar pruebas SQL con `pnpm supabase test db` o `supabase test db` cuando Docker esté disponible.
5. Abrir una sola PR contra `main` con checklist de macrofase.
6. Esperar CI verde y Vercel Preview Ready.
7. Merge solo por el propietario/revisor autorizado.
