# Arquitectura de seguridad

## Supabase
- Tablas privadas con RLS habilitada.
- Políticas CRUD por propietario usando `auth.uid() = user_id`.
- `profiles.id` debe coincidir con `profiles.user_id`.
- Claves foráneas compuestas preservan aislamiento por usuario.
- Storage `avatars` limita escritura/borrado a la carpeta del propietario.
- `service_role` queda reservado para backend confiable y nunca para cliente.

## Web
- Headers de seguridad definidos en `next.config.mjs`.
- CSP permite Next.js, Supabase configurado por variables públicas, imágenes/avatar y desarrollo local.
- `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'` y `form-action 'self'` reducen superficie XSS/clickjacking.

## Repositorio
- CodeQL para TypeScript/JavaScript.
- Dependabot agrupado para pnpm/npm y GitHub Actions.
- Recomendado activar branch protection, required reviews, secret scanning, Dependabot alerts y bloqueo de force-push en `main`.

## Security Advisor
Ejecutar manualmente en Supabase Dashboard: `Project > Security Advisor > Run checks`. Revisar RLS disabled, policies permissive, leaked credentials, extensions y storage policies. Adjuntar captura o exportar hallazgos a la PR antes de merge.

## Enmienda 2026-07-21: planificación académica avanzada
Las notas jerárquicas usan grupos por usuario, semestre y asignatura; `grades` conserva compatibilidad legacy como evaluaciones. Las proyecciones dependen de pesos válidos, el consejero académico es determinista sin servicios externos y el PDF de horario se genera localmente sin incluir correo por defecto.
