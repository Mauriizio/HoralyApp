# Arquitectura de plugins internos

Los plugins de HoralyApp son módulos confiables incluidos durante build. No cargan JavaScript remoto, no ejecutan `eval`, no usan iframes externos y no reciben cliente Supabase, cookies, JWT ni sesión.

Cada plugin declara:

- `id`, `name`, `description`, `version`;
- categoría: Electricidad, Electrónica, Automatización, Matemáticas o Utilidades;
- icono, estado (`available` o `coming-soon`) y feature flag opcional;
- capacidades, permisos y rutas internas;
- componente interno resuelto por el catálogo.

El registro valida duplicados, feature flags y permisos permitidos por capacidades antes de exponer navegación. La UI de catálogo ofrece búsqueda, filtro por categoría, tarjetas accesibles por teclado, estado disponible/próximamente, apertura de herramienta, retorno al catálogo y error boundary por herramienta.

Los plugins que necesiten persistencia deben usar almacenamiento namespaced (`plugin:{id}`) y permisos mínimos. La primera herramienta activa es `resistor-color-code`, implementada sin datos personales ni acceso a Supabase.
