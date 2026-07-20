# Arquitectura de plugins internos

Los plugins de HoralyApp son módulos confiables incluidos en build. No cargan JavaScript remoto ni reciben cliente Supabase, cookies o sesión. Solo acceden a un contexto mínimo con datos académicos de solo lectura, logger y almacenamiento namespaced.

Cada plugin declara manifiesto, versión, rutas, capacidades, permisos y feature flag. El registro valida duplicados y permisos antes de exponer navegación.
