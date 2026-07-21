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

## Checklist adicional Auth + Herramientas

- Validar Auth invitado en móvil y escritorio: acciones públicas visibles, sin avatar y sin menú.
- Validar usuario autenticado: acciones públicas ocultas y perfil visible.
- Validar X y “Volver a Horaly” en login, registro, recuperación, actualización y status.
- Validar que redirects externos en callback regresan al fallback interno.
- Validar registro con confirmación de contraseña y doble submit bloqueado.
- Validar `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=false` ocultando Google y `true` mostrando el botón.
- Validar catálogo de herramientas, búsqueda, filtros, teclado y error boundary.
- Validar plugin de resistencias con 4, 5 y 6 bandas, ambos sentidos y entradas inválidas.

## Checklist adicional para plataforma de herramientas

- Confirmar que una herramienta nueva se integra solo copiando carpeta y registrando una entrada en `plugins/index.ts`.
- Confirmar que `PluginsView` no importa plugins concretos ni IDs de herramientas.
- Confirmar que `plugin-registry.ts` no importa módulos concretos.
- Ejecutar `pnpm tool:create herramienta-temporal`, validar estructura, no registrarla y eliminarla.
- Verificar catálogo, búsqueda, filtros, lazy loading, fallback accesible y error boundary.
